import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { members, activities, events } from "@/db/schema";
import { sql, gte, eq, and } from "drizzle-orm";
import { cacheGet, cacheSet, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";

// GET /api/community/stats — aggregate community stats (replaces hardcoded values)
export async function GET() {
  // Try cache first
  const cached = await cacheGet<Record<string, number>>(
    CACHE_KEYS.communityStats
  );
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "X-Cache": "HIT" },
    });
  }

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

  // Upcoming events count (must match events API: status='upcoming' AND date >= now)
  const now = new Date();
  const [eventCount] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(events)
    .where(and(eq(events.status, "upcoming"), gte(events.date, now)));

  const result = {
    members: memberCount.count,
    totalRuns: activityStats.totalRuns,
    totalDistanceKm: Math.round(activityStats.totalDistanceM / 1000),
    totalTimeHours: Math.round(activityStats.totalTimeSec / 3600),
    monthlyRuns: monthStats.runs,
    monthlyDistanceKm: Math.round(monthStats.distanceM / 1000),
    upcomingEvents: eventCount.count,
  };

  // Cache the result
  await cacheSet(CACHE_KEYS.communityStats, result, CACHE_TTL.communityStats);

  return NextResponse.json(result, {
    headers: { "X-Cache": "MISS" },
  });
}
