import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activities } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { getRequestUser } from "@/lib/mobile-auth";

// GET /api/members/me/weekly-history — last 12 weeks of activity data
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Calculate 12 weeks ago from start of current week (Monday)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - mondayOffset);
  currentWeekStart.setHours(0, 0, 0, 0);

  const twelveWeeksAgo = new Date(currentWeekStart);
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 11 * 7); // 12 weeks total including current

  const rows = await db
    .select({
      weekStart: sql<string>`date_trunc('week', ${activities.startTime})::date`,
      totalDistanceM: sql<number>`COALESCE(SUM(${activities.distanceM}), 0)::int`,
      totalTimeSec: sql<number>`COALESCE(SUM(${activities.movingTimeSec}), 0)::int`,
      totalElevationM: sql<number>`COALESCE(SUM(${activities.elevationGainM}), 0)::int`,
      runCount: sql<number>`COUNT(*)::int`,
    })
    .from(activities)
    .where(and(
      eq(activities.memberId, user.id),
      gte(activities.startTime, twelveWeeksAgo),
    ))
    .groupBy(sql`date_trunc('week', ${activities.startTime})::date`)
    .orderBy(sql`date_trunc('week', ${activities.startTime})::date`);

  // Fill in missing weeks with zeros
  const weeks: Array<{
    weekStart: string;
    totalDistanceM: number;
    totalTimeSec: number;
    totalElevationM: number;
    runCount: number;
  }> = [];

  for (let i = 0; i < 12; i++) {
    const weekDate = new Date(twelveWeeksAgo);
    weekDate.setDate(weekDate.getDate() + i * 7);
    const weekStr = weekDate.toISOString().split("T")[0];

    const match = rows.find(r => {
      const rDate = new Date(r.weekStart);
      return Math.abs(rDate.getTime() - weekDate.getTime()) < 2 * 86400000; // within 2 days tolerance
    });

    weeks.push({
      weekStart: weekStr,
      totalDistanceM: match?.totalDistanceM || 0,
      totalTimeSec: match?.totalTimeSec || 0,
      totalElevationM: match?.totalElevationM || 0,
      runCount: match?.runCount || 0,
    });
  }

  // Current month stats
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [monthStats] = await db
    .select({
      totalDistanceM: sql<number>`COALESCE(SUM(${activities.distanceM}), 0)::int`,
      totalTimeSec: sql<number>`COALESCE(SUM(${activities.movingTimeSec}), 0)::int`,
      runCount: sql<number>`COUNT(*)::int`,
    })
    .from(activities)
    .where(and(eq(activities.memberId, user.id), gte(activities.startTime, monthStart)));

  // Streak: consecutive weeks with at least 1 activity
  let streak = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (weeks[i].runCount > 0) streak++;
    else break;
  }

  return NextResponse.json({
    weeks,
    currentMonth: {
      name: now.toLocaleString("tr-TR", { month: "long", year: "numeric" }),
      ...monthStats,
      streak,
      streakActivities: weeks.filter(w => w.runCount > 0).reduce((sum, w) => sum + w.runCount, 0),
    },
  });
}
