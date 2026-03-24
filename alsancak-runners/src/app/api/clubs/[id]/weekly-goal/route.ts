import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { activities, clubMembers, clubWeeklyGoals } from "@/db/schema";
import { getRequestUser } from "@/lib/mobile-auth";
import { checkRateLimit } from "@/lib/rateLimit";

function getWeekStartDate(input = new Date()): string {
  const d = new Date(input);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

async function canManageClub(clubId: string, memberId: string): Promise<boolean> {
  const [membership] = await db
    .select({ role: clubMembers.role, status: clubMembers.status })
    .from(clubMembers)
    .where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.memberId, memberId)))
    .limit(1);

  return !!membership && membership.status === "active" && ["owner", "admin"].includes(membership.role);
}

// GET /api/clubs/:id/weekly-goal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: clubId } = await params;
  const weekStart = getWeekStartDate();

  const [goal] = await db
    .select({
      id: clubWeeklyGoals.id,
      targetDistanceM: clubWeeklyGoals.targetDistanceM,
      createdBy: clubWeeklyGoals.createdBy,
      weekStart: clubWeeklyGoals.weekStart,
    })
    .from(clubWeeklyGoals)
    .where(and(eq(clubWeeklyGoals.clubId, clubId), eq(clubWeeklyGoals.weekStart, weekStart)))
    .limit(1);

  const weekStartDate = new Date(`${weekStart}T00:00:00.000Z`);
  const [totals] = await db
    .select({
      distanceM: sql<number>`COALESCE(SUM(${activities.distanceM})::int, 0)`,
      runsCount: sql<number>`COUNT(*)::int`,
      activeRunners: sql<number>`COUNT(DISTINCT ${activities.memberId})::int`,
    })
    .from(activities)
    .where(
      and(
        gte(activities.startTime, weekStartDate),
        sql`${activities.memberId} IN (
          SELECT ${clubMembers.memberId}
          FROM ${clubMembers}
          WHERE ${clubMembers.clubId} = ${clubId}
            AND ${clubMembers.status} = 'active'
        )`,
      ),
    );

  const distanceM = Number(totals?.distanceM || 0);
  const targetDistanceM = goal?.targetDistanceM || 0;

  return NextResponse.json({
    weekStart,
    goal: goal || null,
    progress: {
      distanceM,
      runsCount: Number(totals?.runsCount || 0),
      activeRunners: Number(totals?.activeRunners || 0),
      targetDistanceM,
      completionPercent: targetDistanceM > 0 ? Math.min(100, Math.round((distanceM / targetDistanceM) * 100)) : 0,
    },
  });
}

// POST /api/clubs/:id/weekly-goal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rateLimited = await checkRateLimit(`club:weekly-goal:${user.id}`, {
    maxRequests: 20,
    windowSec: 3600,
    strict: true,
  });
  if (rateLimited) return rateLimited;

  const { id: clubId } = await params;
  if (!(await canManageClub(clubId, user.id))) {
    return NextResponse.json({ error: "Only owner/admin can set weekly goal" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const targetDistanceM = Number(body?.targetDistanceM || 0);
  if (!Number.isFinite(targetDistanceM) || targetDistanceM < 1000 || targetDistanceM > 500000) {
    return NextResponse.json({ error: "targetDistanceM must be between 1000 and 500000" }, { status: 400 });
  }

  const weekStart = getWeekStartDate();

  const [existing] = await db
    .select({ id: clubWeeklyGoals.id })
    .from(clubWeeklyGoals)
    .where(and(eq(clubWeeklyGoals.clubId, clubId), eq(clubWeeklyGoals.weekStart, weekStart)))
    .limit(1);

  if (existing) {
    await db
      .update(clubWeeklyGoals)
      .set({ targetDistanceM, updatedAt: new Date() })
      .where(eq(clubWeeklyGoals.id, existing.id));
  } else {
    await db.insert(clubWeeklyGoals).values({
      clubId,
      weekStart,
      targetDistanceM,
      createdBy: user.id,
    });
  }

  return NextResponse.json({ success: true, weekStart, targetDistanceM });
}
