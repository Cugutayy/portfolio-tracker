import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { members, stravaConnections, communityStats } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getRequestUser } from "@/lib/mobile-auth";
import { checkRateLimit } from "@/lib/rateLimit";

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const session = { user: { id: user.id } };

  const [member] = await db
    .select({
      id: members.id,
      name: members.name,
      email: members.email,
      role: members.role,
      bio: members.bio,
      image: members.image,
      instagram: members.instagram,
      paceGroup: members.paceGroup,
      privacy: members.privacy,
      createdAt: members.createdAt,
    })
    .from(members)
    .where(eq(members.id, session.user.id))
    .limit(1);

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Check Strava connection
  const [strava] = await db
    .select({ id: stravaConnections.id })
    .from(stravaConnections)
    .where(eq(stravaConnections.memberId, member.id))
    .limit(1);

  // Get all-time stats
  const [stats] = await db
    .select()
    .from(communityStats)
    .where(
      and(
        eq(communityStats.memberId, member.id),
        eq(communityStats.period, "all_time"),
      ),
    )
    .limit(1);

  return NextResponse.json({
    id: member.id,
    name: member.name,
    email: member.email,
    instagram: member.instagram,
    paceGroup: member.paceGroup,
    bio: member.bio,
    role: member.role,
    privacy: member.privacy,
    image: member.image,
    stravaConnected: !!strava,
    stats: stats
      ? {
          totalRuns: stats.totalRuns,
          totalDistanceM: stats.totalDistanceM,
          totalTimeSec: stats.totalTimeSec,
          currentStreak: stats.streakDays,
          eventsAttended: stats.eventsAttended,
        }
      : {
          totalRuns: 0,
          totalDistanceM: 0,
          totalTimeSec: 0,
          currentStreak: 0,
          eventsAttended: 0,
        },
  });
}

export async function PATCH(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const rateLimited = await checkRateLimit(`profile:${user.id}`, { maxRequests: 10, windowSec: 60 });
  if (rateLimited) return rateLimited;
  const session = { user: { id: user.id } };

  try {
    const body = await request.json();
    const { name, instagram, paceGroup, bio, privacy, image } = body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name.trim();
    if (instagram !== undefined) updateData.instagram = instagram?.trim() || null;
    if (paceGroup !== undefined) updateData.paceGroup = paceGroup;
    if (bio !== undefined) updateData.bio = bio?.trim() || null;
    if (privacy !== undefined) updateData.privacy = privacy;
    if (image !== undefined) updateData.image = image;

    const [updated] = await db
      .update(members)
      .set(updateData)
      .where(eq(members.id, session.user.id))
      .returning({
        id: members.id,
        name: members.name,
        email: members.email,
        instagram: members.instagram,
        paceGroup: members.paceGroup,
        bio: members.bio,
        privacy: members.privacy,
        image: members.image,
      });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}
