import { NextRequest, NextResponse } from "next/server";
import { and, count, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { activities, members, onboardingProgress } from "@/db/schema";
import { getRequestUser } from "@/lib/mobile-auth";
import { checkRateLimit } from "@/lib/rateLimit";

function startOfUtcWeek(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

// GET /api/analytics/onboarding?weeks=8
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [currentMember] = await db
    .select({ role: members.role })
    .from(members)
    .where(eq(members.id, user.id))
    .limit(1);

  if (!currentMember || currentMember.role !== "admin") {
    return NextResponse.json({ error: "Only admins can access analytics" }, { status: 403 });
  }

  const rateLimited = await checkRateLimit(`analytics:onboarding:${user.id}`, {
    maxRequests: 30,
    windowSec: 60,
    failOpen: false,
  });
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);
  const weeks = Math.max(1, Math.min(16, parseInt(searchParams.get("weeks") || "8", 10) || 8));

  const thisWeekStart = startOfUtcWeek();
  const cohorts: Array<Record<string, unknown>> = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const cohortStart = addDays(thisWeekStart, -7 * i);
    const cohortEnd = addDays(cohortStart, 7);

    const [{ totalUsers }] = await db
      .select({ totalUsers: count() })
      .from(members)
      .where(and(gte(members.createdAt, cohortStart), lt(members.createdAt, cohortEnd)));

    const total = Number(totalUsers || 0);
    if (total === 0) {
      cohorts.push({
        cohortWeekStart: cohortStart.toISOString().slice(0, 10),
        cohortUsers: 0,
        d1ActivationRate: 0,
        d3ActivationRate: 0,
        d7RetentionRate: 0,
      });
      continue;
    }

    const [{ d1Activated }] = await db
      .select({ d1Activated: sql<number>`COUNT(*)::int` })
      .from(members)
      .where(
        and(
          gte(members.createdAt, cohortStart),
          lt(members.createdAt, cohortEnd),
          sql`EXISTS (
            SELECT 1 FROM ${onboardingProgress} op
            WHERE op.member_id = ${members.id}
              AND op.first_run_completed = true
          )`,
        ),
      );

    const [{ d3Activated }] = await db
      .select({ d3Activated: sql<number>`COUNT(*)::int` })
      .from(members)
      .where(
        and(
          gte(members.createdAt, cohortStart),
          lt(members.createdAt, cohortEnd),
          sql`EXISTS (
            SELECT 1 FROM ${onboardingProgress} op
            WHERE op.member_id = ${members.id}
              AND op.profile_completed = true
              AND op.first_interaction_completed = true
          )`,
        ),
      );

    const [{ d7Retained }] = await db
      .select({ d7Retained: sql<number>`COUNT(DISTINCT ${members.id})::int` })
      .from(members)
      .innerJoin(activities, eq(activities.memberId, members.id))
      .where(
        and(
          gte(members.createdAt, cohortStart),
          lt(members.createdAt, cohortEnd),
          gte(activities.startTime, addDays(cohortStart, 7)),
          lt(activities.startTime, addDays(cohortStart, 14)),
        ),
      );

    const d1 = Number(d1Activated || 0);
    const d3 = Number(d3Activated || 0);
    const d7 = Number(d7Retained || 0);

    cohorts.push({
      cohortWeekStart: cohortStart.toISOString().slice(0, 10),
      cohortUsers: total,
      d1ActivationRate: Math.round((d1 / total) * 1000) / 10,
      d3ActivationRate: Math.round((d3 / total) * 1000) / 10,
      d7RetentionRate: Math.round((d7 / total) * 1000) / 10,
      raw: {
        d1Activated: d1,
        d3Activated: d3,
        d7Retained: d7,
      },
    });
  }

  return NextResponse.json({
    weeks,
    metricDefinitions: {
      d1ActivationRate: "% of cohort with first_run_completed",
      d3ActivationRate: "% of cohort with profile_completed + first_interaction_completed",
      d7RetentionRate: "% of cohort with an activity in days 7-13",
    },
    cohorts,
  });
}
