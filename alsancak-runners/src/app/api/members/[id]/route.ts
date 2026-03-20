import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import { members, activities, follows } from "@/db/schema";
import { eq, and, count, sum, avg } from "drizzle-orm";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [member] = await db
    .select({
      id: members.id,
      name: members.name,
      image: members.image,
      bio: members.bio,
      paceGroup: members.paceGroup,
      privacy: members.privacy,
    })
    .from(members)
    .where(eq(members.id, id))
    .limit(1);

  if (!member) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });

  // Privacy check: if profile is private, only the owner can view it
  let currentUserId: string | null = null;
  try {
    const currentUser = await getRequestUser(request);
    if (currentUser) currentUserId = currentUser.id;
  } catch {}

  if (member.privacy === "private" && currentUserId !== member.id) {
    return NextResponse.json({
      member: { id: member.id, name: member.name, image: member.image, privacy: "private" },
      stats: { totalRuns: 0, totalDistanceM: 0, avgPace: 0 },
      followerCount: 0,
      followingCount: 0,
      isFollowing: false,
      isPrivate: true,
    });
  }

  // Stats
  const [stats] = await db
    .select({
      totalRuns: count(),
      totalDistanceM: sum(activities.distanceM),
      avgPace: avg(activities.avgPaceSecKm),
    })
    .from(activities)
    .where(eq(activities.memberId, id));

  // Follower/following counts
  const [{ value: followerCount }] = await db.select({ value: count() }).from(follows).where(eq(follows.followingId, id));
  const [{ value: followingCount }] = await db.select({ value: count() }).from(follows).where(eq(follows.followerId, id));

  // Check if current user follows this member
  let isFollowing = false;
  if (currentUserId && currentUserId !== id) {
    const [existing] = await db
      .select({ id: follows.id })
      .from(follows)
      .where(and(eq(follows.followerId, currentUserId), eq(follows.followingId, id)))
      .limit(1);
    isFollowing = !!existing;
  }

  return NextResponse.json({
    member,
    stats: {
      totalRuns: Number(stats?.totalRuns || 0),
      totalDistanceM: Number(stats?.totalDistanceM || 0),
      avgPace: Number(stats?.avgPace || 0),
    },
    followerCount: Number(followerCount),
    followingCount: Number(followingCount),
    isFollowing,
  });
}
