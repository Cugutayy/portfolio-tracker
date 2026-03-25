import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { challenges, challengeParticipants, members } from "@/db/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { getRequestUser } from "@/lib/mobile-auth";
import { checkRateLimit } from "@/lib/rateLimit";

// GET /api/challenges — list active/upcoming challenges
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const rateLimited = await checkRateLimit(`challenges:${user.id}`, { maxRequests: 30, windowSec: 60 });
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "active";

  const now = new Date();
  const rows = await db
    .select({
      id: challenges.id,
      title: challenges.title,
      description: challenges.description,
      type: challenges.type,
      goalValue: challenges.goalValue,
      startDate: challenges.startDate,
      endDate: challenges.endDate,
      status: challenges.status,
      visibility: challenges.visibility,
      creatorName: members.name,
      participantCount: sql<number>`(SELECT COUNT(*)::int FROM ${challengeParticipants} WHERE ${challengeParticipants.challengeId} = ${challenges.id})`,
      myProgress: sql<number | null>`(SELECT ${challengeParticipants.progress} FROM ${challengeParticipants} WHERE ${challengeParticipants.challengeId} = ${challenges.id} AND ${challengeParticipants.memberId} = ${user.id})`,
      hasJoined: sql<boolean>`EXISTS(SELECT 1 FROM ${challengeParticipants} WHERE ${challengeParticipants.challengeId} = ${challenges.id} AND ${challengeParticipants.memberId} = ${user.id})`,
    })
    .from(challenges)
    .innerJoin(members, eq(challenges.createdBy, members.id))
    .where(
      status === "active"
        ? and(eq(challenges.status, "active"), lte(challenges.startDate, now), gte(challenges.endDate, now))
        : status === "upcoming"
          ? and(eq(challenges.status, "active"), gte(challenges.startDate, now))
          : eq(challenges.status, "completed")
    )
    .orderBy(desc(challenges.startDate))
    .limit(20);

  return NextResponse.json({ challenges: rows });
}

// POST /api/challenges — create a new challenge
export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const rateLimited = await checkRateLimit(`challenges:create:${user.id}`, { maxRequests: 5, windowSec: 300 });
  if (rateLimited) return rateLimited;

  const body = await request.json();
  const { title, description, type, goalValue, startDate, endDate, groupId } = body;

  if (!title || !type || !goalValue || !startDate || !endDate) {
    return NextResponse.json({ error: "title, type, goalValue, startDate, endDate required" }, { status: 400 });
  }

  const validTypes = ["distance_total", "run_count", "elevation_total", "streak_days"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: `type must be: ${validTypes.join(", ")}` }, { status: 400 });
  }

  const [created] = await db.insert(challenges).values({
    title,
    description: description || null,
    type,
    goalValue: Number(goalValue),
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    groupId: groupId || null,
    createdBy: user.id,
    visibility: groupId ? "group" : "public",
    status: "active",
  }).returning({ id: challenges.id });

  // Auto-join the creator
  await db.insert(challengeParticipants).values({
    challengeId: created.id,
    memberId: user.id,
    progress: 0,
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
