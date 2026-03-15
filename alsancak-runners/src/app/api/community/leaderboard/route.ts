import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activities, members } from "@/db/schema";
import { sql, gte, eq, inArray } from "drizzle-orm";

// GET /api/community/leaderboard — period-based leaderboard
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "month"; // week, month, year, all_time
  const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));

  // Calculate period start
  const now = new Date();
  let periodStart: Date;

  switch (period) {
    case "week": {
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
      periodStart.setHours(0, 0, 0, 0);
      break;
    }
    case "month": {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
    case "year": {
      periodStart = new Date(now.getFullYear(), 0, 1);
      break;
    }
    default: {
      // all_time
      periodStart = new Date(2020, 0, 1);
    }
  }

  // Aggregate activities per member for the period
  // Only include Strava-sourced activities (no manual entry gaming)
  const leaderboard = await db
    .select({
      memberId: activities.memberId,
      memberName: members.name,
      memberImage: members.image,
      totalRuns: sql<number>`COUNT(*)::int`,
      totalDistanceM: sql<number>`COALESCE(SUM(${activities.distanceM}), 0)::real`,
      totalTimeSec: sql<number>`COALESCE(SUM(${activities.movingTimeSec}), 0)::int`,
      totalElevationM: sql<number>`COALESCE(SUM(${activities.elevationGainM}), 0)::real`,
      avgPaceSecKm: sql<number>`COALESCE(AVG(${activities.avgPaceSecKm}), 0)::real`,
    })
    .from(activities)
    .innerJoin(members, eq(activities.memberId, members.id))
    .where(
      sql`${activities.startTime} >= ${periodStart}
        AND ${members.privacy} IN ('public', 'members')
        AND ${activities.source} = 'strava'`,
    )
    .groupBy(activities.memberId, members.name, members.image)
    .orderBy(sql`SUM(${activities.distanceM}) DESC`)
    .limit(limit);

  return NextResponse.json({
    period,
    periodStart: periodStart.toISOString(),
    leaderboard: leaderboard.map((entry, i) => ({
      rank: i + 1,
      ...entry,
      totalDistanceKm: Math.round((entry.totalDistanceM / 1000) * 10) / 10,
    })),
  });
}
