import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { members, activities, events, eventRsvps } from "@/db/schema";
import { sql, gte, eq } from "drizzle-orm";

// GET /api/community/stats — aggregate community stats (replaces hardcoded values)
export async function GET() {
  // Total members
  const [memberCount] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(members);

  // Total activities + aggregates
  const [activityStats] = await db
    .select({
      totalRuns: sql<number>`COUNT(*)::int`,
      totalDistanceM: sql<number>`COALESCE(SUM(distance_m), 0)::real`,
      totalTimeSec: sql<number>`COALESCE(SUM(moving_time_sec), 0)::int`,
    })
    .from(activities);

  // This month's stats
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [monthStats] = await db
    .select({
      runs: sql<number>`COUNT(*)::int`,
      distanceM: sql<number>`COALESCE(SUM(distance_m), 0)::real`,
    })
    .from(activities)
    .where(gte(activities.startTime, monthStart));

  // Upcoming events count
  const [eventCount] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(events)
    .where(eq(events.status, "upcoming"));

  return NextResponse.json({
    members: memberCount.count,
    totalRuns: activityStats.totalRuns,
    totalDistanceKm: Math.round(activityStats.totalDistanceM / 1000),
    totalTimeHours: Math.round(activityStats.totalTimeSec / 3600),
    monthlyRuns: monthStats.runs,
    monthlyDistanceKm: Math.round(monthStats.distanceM / 1000),
    upcomingEvents: eventCount.count,
  });
}
