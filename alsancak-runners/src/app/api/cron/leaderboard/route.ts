import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activities, members } from "@/db/schema";
import { sql, eq } from "drizzle-orm";
import { cacheSet, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";

/**
 * GET /api/cron/leaderboard
 * Pre-computes leaderboard data for all periods and caches in Redis.
 * Triggered by Vercel Cron (daily) or manually with cron secret.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const periods = ["week", "month", "year", "all_time"] as const;
  const results: Record<string, number> = {};

  for (const period of periods) {
    const now = new Date();
    let periodStart: Date;

    switch (period) {
      case "week": {
        periodStart = new Date(now);
        periodStart.setDate(now.getDate() - now.getDay());
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
        periodStart = new Date(2020, 0, 1);
      }
    }

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
          AND ${activities.sharedToBoard} = true`
      )
      .groupBy(activities.memberId, members.name, members.image)
      .orderBy(sql`SUM(${activities.distanceM}) DESC`)
      .limit(50);

    const data = {
      period,
      periodStart: periodStart.toISOString(),
      leaderboard: leaderboard.map((entry, i) => ({
        rank: i + 1,
        ...entry,
        totalDistanceKm: Math.round((entry.totalDistanceM / 1000) * 10) / 10,
      })),
    };

    // Cache with longer TTL for cron-generated data (1 hour)
    await cacheSet(CACHE_KEYS.leaderboard(period), data, 3600);
    results[period] = leaderboard.length;
  }

  return NextResponse.json({
    ok: true,
    cached: results,
    timestamp: new Date().toISOString(),
  });
}
