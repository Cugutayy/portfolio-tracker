import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { challenges, challengeParticipants, members } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getRequestUser } from "@/lib/mobile-auth";

// GET /api/challenges/:id — challenge detail with leaderboard
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const [challenge] = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, id))
    .limit(1);

  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  // Leaderboard
  const leaderboard = await db
    .select({
      memberId: challengeParticipants.memberId,
      memberName: members.name,
      memberImage: members.image,
      progress: challengeParticipants.progress,
      completedAt: challengeParticipants.completedAt,
      joinedAt: challengeParticipants.joinedAt,
    })
    .from(challengeParticipants)
    .innerJoin(members, eq(challengeParticipants.memberId, members.id))
    .where(eq(challengeParticipants.challengeId, id))
    .orderBy(desc(challengeParticipants.progress))
    .limit(50);

  // Check if user has joined
  const hasJoined = leaderboard.some((p) => p.memberId === user.id);
  const myProgress = leaderboard.find((p) => p.memberId === user.id)?.progress ?? null;

  return NextResponse.json({
    challenge,
    leaderboard,
    hasJoined,
    myProgress,
  });
}

// POST /api/challenges/:id — join challenge
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Check challenge exists and is active
  const [challenge] = await db
    .select({ id: challenges.id, status: challenges.status, endDate: challenges.endDate })
    .from(challenges)
    .where(eq(challenges.id, id))
    .limit(1);

  if (!challenge) return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  if (challenge.status !== "active" || new Date(challenge.endDate) < new Date()) {
    return NextResponse.json({ error: "Challenge is not active" }, { status: 400 });
  }

  // Check if already joined
  const [existing] = await db
    .select({ id: challengeParticipants.id })
    .from(challengeParticipants)
    .where(and(eq(challengeParticipants.challengeId, id), eq(challengeParticipants.memberId, user.id)))
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: "Already joined" }, { status: 409 });
  }

  await db.insert(challengeParticipants).values({
    challengeId: id,
    memberId: user.id,
    progress: 0,
  });

  return NextResponse.json({ success: true, action: "joined" });
}
