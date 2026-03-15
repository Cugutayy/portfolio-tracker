import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { activities } from "@/db/schema";
import { eq, and, gte, lt, sql, desc } from "drizzle-orm";

/**
 * GET /api/members/weekly
 * Returns the current member's weekly running summary.
 * Computed live from activities (no pre-aggregation needed for MVP).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const memberId = session.user.id;

  // Compute current week boundaries (Monday 00:00 → next Monday 00:00)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  // Previous week for comparison
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(weekStart.getDate() - 7);

  // Current week aggregation
  const [currentWeek] = await db
    .select({
      totalRuns: sql<number>`count(*)::int`,
      totalDistanceM: sql<number>`coalesce(sum(${activities.distanceM}), 0)`,
      totalTimeSec: sql<number>`coalesce(sum(${activities.movingTimeSec}), 0)`,
      totalElevationM: sql<number>`coalesce(sum(${activities.elevationGainM}), 0)`,
      avgPaceSecKm: sql<number>`case when sum(${activities.distanceM}) > 0 then sum(${activities.movingTimeSec}) / (sum(${activities.distanceM}) / 1000.0) else null end`,
      longestRunM: sql<number>`coalesce(max(${activities.distanceM}), 0)`,
    })
    .from(activities)
    .where(
      and(
        eq(activities.memberId, memberId),
        gte(activities.startTime, weekStart),
        lt(activities.startTime, weekEnd),
      ),
    );

  // Previous week aggregation (for delta/trend)
  const [prevWeek] = await db
    .select({
      totalRuns: sql<number>`count(*)::int`,
      totalDistanceM: sql<number>`coalesce(sum(${activities.distanceM}), 0)`,
      totalTimeSec: sql<number>`coalesce(sum(${activities.movingTimeSec}), 0)`,
    })
    .from(activities)
    .where(
      and(
        eq(activities.memberId, memberId),
        gte(activities.startTime, prevWeekStart),
        lt(activities.startTime, weekStart),
      ),
    );

  // This week's activities list
  const weekActivities = await db
    .select({
      id: activities.id,
      title: activities.title,
      activityType: activities.activityType,
      startTime: activities.startTime,
      distanceM: activities.distanceM,
      movingTimeSec: activities.movingTimeSec,
      avgPaceSecKm: activities.avgPaceSecKm,
      elevationGainM: activities.elevationGainM,
    })
    .from(activities)
    .where(
      and(
        eq(activities.memberId, memberId),
        gte(activities.startTime, weekStart),
        lt(activities.startTime, weekEnd),
      ),
    )
    .orderBy(desc(activities.startTime));

  // Compute distance delta
  const distanceDelta =
    prevWeek.totalDistanceM > 0
      ? ((currentWeek.totalDistanceM - prevWeek.totalDistanceM) /
          prevWeek.totalDistanceM) *
        100
      : null;

  return NextResponse.json({
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    current: {
      totalRuns: currentWeek.totalRuns,
      totalDistanceM: Math.round(currentWeek.totalDistanceM),
      totalDistanceKm: +(currentWeek.totalDistanceM / 1000).toFixed(1),
      totalTimeSec: currentWeek.totalTimeSec,
      totalElevationM: Math.round(currentWeek.totalElevationM),
      avgPaceSecKm: currentWeek.avgPaceSecKm
        ? Math.round(currentWeek.avgPaceSecKm)
        : null,
      longestRunM: Math.round(currentWeek.longestRunM),
      longestRunKm: +(currentWeek.longestRunM / 1000).toFixed(1),
    },
    previous: {
      totalRuns: prevWeek.totalRuns,
      totalDistanceM: Math.round(prevWeek.totalDistanceM),
      totalDistanceKm: +(prevWeek.totalDistanceM / 1000).toFixed(1),
      totalTimeSec: prevWeek.totalTimeSec,
    },
    distanceDeltaPercent: distanceDelta !== null ? +distanceDelta.toFixed(1) : null,
    activities: weekActivities,
  });
}
