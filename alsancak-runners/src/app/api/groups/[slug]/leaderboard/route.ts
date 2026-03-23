import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { groups, groupMembers, activities, members } from "@/db/schema";
import { eq, sql, and, gte } from "drizzle-orm";

// GET /api/groups/[slug]/leaderboard — group leaderboard
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "month"; // week, month
  const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));

  const [group] = await db
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.slug, slug))
    .limit(1);

  if (!group) return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 });

  // Calculate period start
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
    default: {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }

  const memberSubquery = sql`(SELECT ${groupMembers.memberId} FROM ${groupMembers} WHERE ${groupMembers.groupId} = ${group.id})`;

  const leaderboard = await db
    .select({
      memberId: activities.memberId,
      memberName: members.name,
      memberImage: members.image,
      totalRuns: sql<number>`COUNT(*)::int`,
      totalDistanceM: sql<number>`COALESCE(SUM(${activities.distanceM}), 0)::real`,
      totalTimeSec: sql<number>`COALESCE(SUM(${activities.movingTimeSec}), 0)::int`,
      totalElevationM: sql<number>`COALESCE(SUM(${activities.elevationGainM}), 0)::real`,
      avgPaceSecKm: sql<number>`CASE WHEN SUM(${activities.distanceM}) > 0 THEN (SUM(${activities.movingTimeSec})::real / (SUM(${activities.distanceM})::real / 1000)) ELSE 0 END::real`,
    })
    .from(activities)
    .innerJoin(members, eq(activities.memberId, members.id))
    .where(
      and(
        sql`${activities.memberId} IN ${memberSubquery}`,
        gte(activities.startTime, periodStart),
      ),
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
