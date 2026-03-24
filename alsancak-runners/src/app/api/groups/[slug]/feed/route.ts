import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import {
  groups, groupMembers, posts, postKudos, postComments,
  activities, kudos, comments, members,
} from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";

// GET /api/groups/[slug]/feed — mixed feed of posts + activities from group members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0"));

  const [group] = await db
    .select({ id: groups.id, visibility: groups.visibility })
    .from(groups)
    .where(eq(groups.slug, slug))
    .limit(1);

  if (!group) return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 });

  // Optional auth for kudos status
  let currentUserId: string | null = null;
  try {
    const user = await getRequestUser(request);
    if (user) currentUserId = user.id;
  } catch {}

  // If private, check membership
  if (group.visibility === "private") {
    if (!currentUserId) return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    const [mem] = await db
      .select({ id: groupMembers.id })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.memberId, currentUserId)))
      .limit(1);
    if (!mem) return NextResponse.json({ error: "Bu grup özeldir" }, { status: 403 });
  }

  const memberSubquery = sql`(SELECT ${groupMembers.memberId} FROM ${groupMembers} WHERE ${groupMembers.groupId} = ${group.id})`;

  // Posts with this groupId
  const groupPosts = await db
    .select({
      id: posts.id,
      type: sql<string>`'post'`,
      memberId: posts.memberId,
      memberName: members.name,
      memberImage: members.image,
      text: posts.text,
      photoUrl: posts.photoUrl,
      photoUrl2: posts.photoUrl2,
      photoUrl3: posts.photoUrl3,
      createdAt: posts.createdAt,
      kudosCount: sql<number>`(SELECT COUNT(*)::int FROM ${postKudos} WHERE ${postKudos.postId} = ${posts.id})`,
      commentCount: sql<number>`(SELECT COUNT(*)::int FROM ${postComments} WHERE ${postComments.postId} = ${posts.id})`,
      hasKudosed: currentUserId
        ? sql<boolean>`EXISTS(SELECT 1 FROM ${postKudos} WHERE ${postKudos.postId} = ${posts.id} AND ${postKudos.memberId} = ${currentUserId})`
        : sql<boolean>`false`,
      // Activity-specific fields (null for posts)
      title: sql<string | null>`NULL`,
      distanceM: sql<number | null>`NULL`,
      movingTimeSec: sql<number | null>`NULL`,
      avgPaceSecKm: sql<number | null>`NULL`,
    })
    .from(posts)
    .innerJoin(members, eq(posts.memberId, members.id))
    .where(eq(posts.groupId, group.id))
    .orderBy(desc(posts.createdAt))
    .limit(limit + 1);

  // Activities from group members
  const groupActivities = await db
    .select({
      id: activities.id,
      type: sql<string>`'activity'`,
      memberId: activities.memberId,
      memberName: members.name,
      memberImage: members.image,
      text: sql<string | null>`NULL`,
      photoUrl: sql<string | null>`NULL`,
      photoUrl2: sql<string | null>`NULL`,
      photoUrl3: sql<string | null>`NULL`,
      createdAt: activities.createdAt,
      kudosCount: sql<number>`(SELECT COUNT(*)::int FROM ${kudos} WHERE ${kudos.activityId} = ${activities.id})`,
      commentCount: sql<number>`(SELECT COUNT(*)::int FROM ${comments} WHERE ${comments.activityId} = ${activities.id})`,
      hasKudosed: currentUserId
        ? sql<boolean>`EXISTS(SELECT 1 FROM ${kudos} WHERE ${kudos.activityId} = ${activities.id} AND ${kudos.memberId} = ${currentUserId})`
        : sql<boolean>`false`,
      title: activities.title,
      distanceM: activities.distanceM,
      movingTimeSec: activities.movingTimeSec,
      avgPaceSecKm: activities.avgPaceSecKm,
    })
    .from(activities)
    .innerJoin(members, eq(activities.memberId, members.id))
    .where(
      and(
        eq(activities.sharedToBoard, true),
        sql`${activities.memberId} IN ${memberSubquery}`,
      ),
    )
    .orderBy(desc(activities.createdAt))
    .limit(limit + 1);

  // Merge and sort by createdAt DESC (at most 2*(limit+1) items)
  const feed = [...groupPosts, ...groupActivities]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit + 1);

  const hasMore = feed.length > limit;
  const trimmed = hasMore ? feed.slice(0, limit) : feed;

  return NextResponse.json({ feed: trimmed, hasMore });
}
