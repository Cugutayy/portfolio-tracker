import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activities } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { getRequestUser } from "@/lib/mobile-auth";

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

  return NextResponse.json({ id: created.id }, { status: 201 });
}
