import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { members, stravaConnections, communityStats, follows, activities } from "@/db/schema";
import { eq, and, count, gte, lt, sql } from "drizzle-orm";
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

  // Get follower/following counts
  const [{ value: followerCount }] = await db
    .select({ value: count() })
    .from(follows)
    .where(eq(follows.followingId, member.id));

  const [{ value: followingCount }] = await db
    .select({ value: count() })
    .from(follows)
    .where(eq(follows.followerId, member.id));

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

  // Weekly stats (Turkey time UTC+3, Monday-based weeks)
  const now = new Date();
  const turkeyOffset = 3 * 60 * 60 * 1000;
  const turkeyNow = new Date(now.getTime() + turkeyOffset);
  const dayOfWeek = turkeyNow.getUTCDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = new Date(turkeyNow);
  thisMonday.setUTCDate(thisMonday.getUTCDate() - mondayOffset);
  thisMonday.setUTCHours(0, 0, 0, 0);
  const thisMondayUTC = new Date(thisMonday.getTime() - turkeyOffset);
  const lastMonday = new Date(thisMondayUTC.getTime() - 7 * 24 * 60 * 60 * 1000);

  const thisWeekStats = await db.select({
    totalRuns: count(),
    totalDistanceM: sql<number>`COALESCE(SUM(${activities.distanceM}), 0)`,
    totalTimeSec: sql<number>`COALESCE(SUM(${activities.movingTimeSec}), 0)`,
  }).from(activities).where(
    and(eq(activities.memberId, member.id), gte(activities.startTime, thisMondayUTC))
  );

  const lastWeekStats = await db.select({
    totalRuns: count(),
    totalDistanceM: sql<number>`COALESCE(SUM(${activities.distanceM}), 0)`,
  }).from(activities).where(
    and(
      eq(activities.memberId, member.id),
      gte(activities.startTime, lastMonday),
      lt(activities.startTime, thisMondayUTC)
    )
  );

  const tw = thisWeekStats[0];
  const lw = lastWeekStats[0];
  const distanceChange = lw.totalDistanceM > 0
    ? Math.round(((tw.totalDistanceM - lw.totalDistanceM) / lw.totalDistanceM) * 100)
    : null;
  const avgPaceSecKm = tw.totalDistanceM > 0
    ? Math.round(tw.totalTimeSec / (tw.totalDistanceM / 1000))
    : null;

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
    followerCount,
    followingCount,
    stravaConnected: !!strava,
    stats: stats
      ? {
          totalRuns: stats.totalRuns,
          totalDistanceM: stats.totalDistanceM,
          totalTimeSec: stats.totalTimeSec,
          avgPaceSecKm: stats.avgPaceSecKm || 0,
          currentStreak: stats.streakDays,
          eventsAttended: stats.eventsAttended,
        }
      : {
          totalRuns: 0,
          totalDistanceM: 0,
          totalTimeSec: 0,
          avgPaceSecKm: 0,
          currentStreak: 0,
          eventsAttended: 0,
        },
    weeklyStats: {
      totalRuns: Number(tw.totalRuns),
      totalDistanceM: Number(tw.totalDistanceM),
      totalTimeSec: Number(tw.totalTimeSec),
      avgPaceSecKm,
      distanceChange,
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
    if (image !== undefined) {
      if (image === null) {
        updateData.image = null;
      } else if (typeof image === "string" && /^data:image\/(jpeg|png|webp|gif);base64,/.test(image) && image.length <= 1_400_000) {
        updateData.image = image;
      }
      // Silently ignore invalid image values
    }

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

export async function DELETE(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // Cascade deletes handle related data (activities, follows, kudos, etc.)
    await db.delete(members).where(eq(members.id, user.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
