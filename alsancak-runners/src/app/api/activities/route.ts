import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { activities, activitySplits, activityPhotos, members, follows } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { getRequestUser } from "@/lib/mobile-auth";
import { sendPushNotifications } from "@/lib/push";

const createActivitySchema = z.object({
  title: z.string().min(1).max(300),
  distanceM: z.number().positive().max(500000),
  movingTimeSec: z.number().int().positive().max(86400),
  startTime: z.string().min(1),
  activityType: z.string().max(50).optional().default("run"),
  polylineEncoded: z.string().max(500000).optional().nullable(),
  startLat: z.number().min(-90).max(90).optional().nullable(),
  startLng: z.number().min(-180).max(180).optional().nullable(),
  endLat: z.number().min(-90).max(90).optional().nullable(),
  endLng: z.number().min(-180).max(180).optional().nullable(),
  elevationGainM: z.number().min(0).max(30000).optional().nullable(),
  elapsedTimeSec: z.number().int().positive().max(86400).optional().nullable(),
  startLocation: z.string().max(500).optional().nullable(),
  endLocation: z.string().max(500).optional().nullable(),
  photoBase64: z.string().max(5_000_000).optional().nullable(),
  splits: z.array(z.object({
    splitIndex: z.number().int(),
    distanceM: z.number(),
    elapsedSec: z.number(),
    paceSecKm: z.number(),
  })).optional().nullable(),
});

/** Haversine distance in meters between two lat/lng points */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Decode Google Encoded Polyline to [lat, lng][] */
function decodePolyline(str: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < str.length) {
    let b, shift = 0, result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
}

/** Compute per-km splits from polyline + total time */
function computeSplits(polylineEncoded: string, totalTimeSec: number, totalDistanceM: number) {
  const points = decodePolyline(polylineEncoded);
  if (points.length < 2) return [];

  const splits: { splitIndex: number; distanceM: number; movingTimeSec: number; avgPaceSecKm: number }[] = [];
  let cumDistance = 0;
  let splitStart = 0;
  let splitIndex = 1;

  for (let i = 1; i < points.length; i++) {
    const d = haversine(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
    cumDistance += d;

    // Every 1000m = 1 split
    if (cumDistance - splitStart >= 1000) {
      const splitDistM = 1000;
      const fraction = splitDistM / totalDistanceM;
      const splitTimeSec = Math.round(totalTimeSec * fraction);
      const paceSecKm = splitTimeSec > 0 ? splitTimeSec : 0;

      splits.push({
        splitIndex,
        distanceM: splitDistM,
        movingTimeSec: splitTimeSec,
        avgPaceSecKm: paceSecKm,
      });

      splitStart += 1000;
      splitIndex++;
    }
  }

  // Last partial split
  const remaining = cumDistance - splitStart;
  if (remaining > 50) { // at least 50m
    const fraction = remaining / totalDistanceM;
    const splitTimeSec = Math.round(totalTimeSec * fraction);
    const paceSecKm = remaining > 0 ? (splitTimeSec / (remaining / 1000)) : 0;

    splits.push({
      splitIndex,
      distanceM: Math.round(remaining),
      movingTimeSec: splitTimeSec,
      avgPaceSecKm: Math.round(paceSecKm),
    });
  }

  return splits;
}

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const session = { user: { id: user.id } };

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const offset = (page - 1) * limit;

  const results = await db
    .select({
      id: activities.id,
      title: activities.title,
      activityType: activities.activityType,
      startTime: activities.startTime,
      distanceM: activities.distanceM,
      movingTimeSec: activities.movingTimeSec,
      elapsedTimeSec: activities.elapsedTimeSec,
      elevationGainM: activities.elevationGainM,
      avgPaceSecKm: activities.avgPaceSecKm,
      avgHeartrate: activities.avgHeartrate,
      polylineEncoded: activities.polylineEncoded,
      source: activities.source,
      stravaActivityId: activities.stravaActivityId,
    })
    .from(activities)
    .where(eq(activities.memberId, session.user.id))
    .orderBy(desc(activities.startTime))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    activities: results,
    page,
    limit,
    hasMore: results.length === limit,
  });
}

// POST /api/activities — manual activity creation (for GPS tracking / non-Strava users)
export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const session = { user: { id: user.id } };

  const rateLimited = await checkRateLimit(
    `create-activity:${session.user.id}`,
    RATE_LIMITS.stravaSync // reuse 5/min limit
  );
  if (rateLimited) return rateLimited;

  const body = await request.json();

  // Zod validation
  const parsed = createActivitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { title, distanceM, movingTimeSec, startTime, activityType, polylineEncoded, startLat, startLng, endLat, endLng, elevationGainM, splits: clientSplits, elapsedTimeSec, photoBase64, startLocation, endLocation } = parsed.data;

  // Validate activity type
  const VALID_ACTIVITY_TYPES = ["run", "walk", "hike", "ride", "swim", "trailrun", "virtualrun"];
  const normalizedType = (activityType || "run").toLowerCase();
  if (!VALID_ACTIVITY_TYPES.includes(normalizedType)) {
    return NextResponse.json(
      { error: `Ge\u00E7ersiz aktivite tipi. Ge\u00E7erli tipler: ${VALID_ACTIVITY_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  const avgPaceSecKm = distanceM > 0 ? (movingTimeSec / (distanceM / 1000)) : null;

  // Atomic: activity + splits + photo in transaction (WebSocket driver supports it)
  const created = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(activities)
      .values({
        memberId: session.user.id,
        source: polylineEncoded ? "gps" : "manual",
        title,
        // Normalize activity type to match Strava format (capitalized)
        activityType: normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1),
        startTime: new Date(startTime),
        elapsedTimeSec: elapsedTimeSec || movingTimeSec,
        movingTimeSec,
        distanceM,
        elevationGainM: elevationGainM || null,
        avgPaceSecKm,
        polylineEncoded: polylineEncoded || null,
        startLat: startLat || null,
        startLng: startLng || null,
        endLat: endLat || null,
        endLng: endLng || null,
        startLocation: startLocation || null,
        endLocation: endLocation || null,
        privacy: "members",
        sharedToBoard: true,
      })
      .returning({ id: activities.id });

    // Store per-km splits: prefer client-provided (has real GPS timestamps) over server-computed (uniform pace)
    if (clientSplits && Array.isArray(clientSplits) && clientSplits.length > 0) {
      // Client-provided splits with actual GPS-derived pace
      await tx.insert(activitySplits).values(
        clientSplits.map((s) => ({
          activityId: inserted.id,
          splitIndex: s.splitIndex,
          distanceM: s.distanceM,
          elapsedTimeSec: s.elapsedSec,
          movingTimeSec: s.elapsedSec,
          avgPaceSecKm: s.paceSecKm,
        })),
      );
    } else if (polylineEncoded && distanceM > 500) {
      // Fallback: compute from polyline with uniform pace (legacy behavior)
      const splits = computeSplits(polylineEncoded, movingTimeSec, distanceM);
      if (splits.length > 0) {
        await tx.insert(activitySplits).values(
          splits.map((s) => ({
            activityId: inserted.id,
            splitIndex: s.splitIndex,
            distanceM: s.distanceM,
            elapsedTimeSec: s.movingTimeSec,
            movingTimeSec: s.movingTimeSec,
            avgPaceSecKm: s.avgPaceSecKm,
          })),
        );
      }
    }

    // Store photo if provided (base64 data URI, max ~500KB)
    if (photoBase64 && typeof photoBase64 === "string") {
      // Validate: must be a valid image data URI (jpeg, png, webp, gif only)
      const validImagePrefix = /^data:image\/(jpeg|png|webp|gif);base64,/;
      if (validImagePrefix.test(photoBase64) && photoBase64.length <= 5_000_000) {
        await tx.insert(activityPhotos).values({
          activityId: inserted.id,
          url: photoBase64,
          caption: null,
          lat: startLat || null,
          lng: startLng || null,
        });
      }
    }

    return inserted;
  });

  // Badge evaluation (best-effort)
  let newBadges: string[] = [];
  try {
    const { evaluateBadges } = await import("@/lib/badge-engine");
    newBadges = await evaluateBadges(session.user.id, created.id);
  } catch {}

  // Personal record detection (best-effort)
  let newPRs: Array<{ distance: string; timeSec: number; previousBestSec: number | null; improvement: number | null }> = [];
  try {
    const { detectPersonalRecords } = await import("@/lib/pr-detector");
    newPRs = await detectPersonalRecords(session.user.id, created.id, distanceM, movingTimeSec);
  } catch {}

  // Notify followers about new activity (fire and forget)
  (async () => {
    try {
      const [creator] = await db
        .select({ name: members.name })
        .from(members)
        .where(eq(members.id, session.user.id))
        .limit(1);

      const followerTokens = await db
        .select({ pushToken: members.pushToken })
        .from(follows)
        .innerJoin(members, eq(follows.followerId, members.id))
        .where(eq(follows.followingId, session.user.id));

      const tokens = followerTokens
        .map(f => f.pushToken)
        .filter((t): t is string => !!t);

      if (tokens.length > 0 && creator) {
        const distKm = (distanceM / 1000).toFixed(1);
        sendPushNotifications(
          tokens,
          "Yeni Ko\u015Fu",
          `\u{1F3C3} ${creator.name} ${distKm} km ko\u015Ftu: ${title}`,
          { type: "activity", activityId: created.id }
        );
      }
    } catch (e) {
      console.error("Activity push notification error:", e);
    }
  })();

  const response: Record<string, unknown> = { id: created.id };
  if (newBadges.length > 0) response.newBadges = newBadges;
  if (newPRs.length > 0) response.newPRs = newPRs;

  return NextResponse.json(response, { status: 201 });
}
