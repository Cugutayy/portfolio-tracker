import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { activities } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

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
