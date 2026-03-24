import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import { weeklyGoals, activities } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

/** Get current ISO week string like "2026-W13" */
function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/** Get Monday 00:00 of current week */
function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * GET /api/members/me/goals — get weekly goal + current progress + streak
 */
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Get or create goal
  let [goal] = await db
    .select()
    .from(weeklyGoals)
    .where(eq(weeklyGoals.memberId, user.id))
    .limit(1);

  if (!goal) {
    [goal] = await db
      .insert(weeklyGoals)
      .values({ memberId: user.id })
      .returning();
  }

  // Calculate this week's progress
  const weekStart = getWeekStart();
  const [progress] = await db
    .select({
      totalRuns: sql<number>`COUNT(*)::int`,
      totalDistanceM: sql<number>`COALESCE(SUM(${activities.distanceM}), 0)::int`,
      totalTimeSec: sql<number>`COALESCE(SUM(${activities.movingTimeSec}), 0)::int`,
    })
    .from(activities)
    .where(and(
      eq(activities.memberId, user.id),
      gte(activities.startTime, weekStart),
    ));

  // Check streak: if last completed week is previous week, streak is active
  const currentWeek = getISOWeek(new Date());
  const lastWeek = getISOWeek(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  const distanceGoalMet = (progress?.totalDistanceM || 0) >= goal.distanceGoalM;
  const runsGoalMet = (progress?.totalRuns || 0) >= goal.runsGoal;
  const weekComplete = distanceGoalMet && runsGoalMet;

  // Auto-update streak if this week is complete and not already recorded
  if (weekComplete && goal.lastCompletedWeek !== currentWeek) {
    const isConsecutive = goal.lastCompletedWeek === lastWeek || goal.currentStreak === 0;
    const newStreak = isConsecutive ? goal.currentStreak + 1 : 1;
    const newLongest = Math.max(goal.longestStreak, newStreak);

    await db
      .update(weeklyGoals)
      .set({
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastCompletedWeek: currentWeek,
        updatedAt: new Date(),
      })
      .where(eq(weeklyGoals.id, goal.id));

    goal = { ...goal, currentStreak: newStreak, longestStreak: newLongest, lastCompletedWeek: currentWeek };
  }

  // If streak broken (last completed week is older than last week), reset
  if (goal.lastCompletedWeek && goal.lastCompletedWeek !== currentWeek && goal.lastCompletedWeek !== lastWeek && goal.currentStreak > 0) {
    await db
      .update(weeklyGoals)
      .set({ currentStreak: 0, updatedAt: new Date() })
      .where(eq(weeklyGoals.id, goal.id));
    goal = { ...goal, currentStreak: 0 };
  }

  return NextResponse.json({
    goal: {
      distanceGoalM: goal.distanceGoalM,
      runsGoal: goal.runsGoal,
      currentStreak: goal.currentStreak,
      longestStreak: goal.longestStreak,
    },
    progress: {
      totalRuns: progress?.totalRuns || 0,
      totalDistanceM: progress?.totalDistanceM || 0,
      totalTimeSec: progress?.totalTimeSec || 0,
      distanceGoalMet,
      runsGoalMet,
      weekComplete,
    },
    currentWeek,
  });
}

/**
 * PATCH /api/members/me/goals — update weekly goal targets
 */
export async function PATCH(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (typeof body.distanceGoalM === "number" && body.distanceGoalM >= 1000 && body.distanceGoalM <= 200000) {
    updateData.distanceGoalM = Math.round(body.distanceGoalM);
  }
  if (typeof body.runsGoal === "number" && body.runsGoal >= 1 && body.runsGoal <= 14) {
    updateData.runsGoal = Math.round(body.runsGoal);
  }

  // Upsert
  const [existing] = await db
    .select({ id: weeklyGoals.id })
    .from(weeklyGoals)
    .where(eq(weeklyGoals.memberId, user.id))
    .limit(1);

  if (existing) {
    await db.update(weeklyGoals).set(updateData).where(eq(weeklyGoals.id, existing.id));
  } else {
    await db.insert(weeklyGoals).values({
      memberId: user.id,
      ...updateData,
    });
  }

  return NextResponse.json({ success: true });
}
