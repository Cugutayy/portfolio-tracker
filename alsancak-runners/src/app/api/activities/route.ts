import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activities, activitySplits } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { getRequestUser } from "@/lib/mobile-auth";

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
  const { title, distanceM, movingTimeSec, startTime, activityType, polylineEncoded, startLat, startLng, endLat, endLng, elevationGainM } = body;

  if (!title || !distanceM || !movingTimeSec || !startTime) {
    return NextResponse.json(
      { error: "Missing required fields: title, distanceM, movingTimeSec, startTime" },
      { status: 400 }
    );
  }

  const avgPaceSecKm = distanceM > 0 ? (movingTimeSec / (distanceM / 1000)) : null;

  const [created] = await db
    .insert(activities)
    .values({
      memberId: session.user.id,
      source: polylineEncoded ? "gps" : "manual",
      title,
      // Normalize activity type to match Strava format (capitalized)
      activityType: (activityType || "run").charAt(0).toUpperCase() + (activityType || "run").slice(1).toLowerCase(),
      startTime: new Date(startTime),
      elapsedTimeSec: movingTimeSec,
      movingTimeSec,
      distanceM,
      elevationGainM: elevationGainM || null,
      avgPaceSecKm,
      polylineEncoded: polylineEncoded || null,
      startLat: startLat || null,
      startLng: startLng || null,
      endLat: endLat || null,
      endLng: endLng || null,
      privacy: "public",
      sharedToBoard: true,
    })
    .returning({ id: activities.id });

  // Compute and store per-km splits from polyline
  if (polylineEncoded && distanceM > 500) {
    try {
      const splits = computeSplits(polylineEncoded, movingTimeSec, distanceM);
      if (splits.length > 0) {
        await db.insert(activitySplits).values(
          splits.map((s) => ({
            activityId: created.id,
            splitIndex: s.splitIndex,
            distanceM: s.distanceM,
            elapsedTimeSec: s.movingTimeSec,
            movingTimeSec: s.movingTimeSec,
            avgPaceSecKm: s.avgPaceSecKm,
          })),
        );
      }
    } catch (e) {
      // Non-critical: splits are best-effort
      console.error("Split computation failed:", e);
    }
  }

  return NextResponse.json({ id: created.id }, { status: 201 });
}
