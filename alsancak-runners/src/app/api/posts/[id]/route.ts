import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import { posts, postKudos, postComments, members } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

// GET /api/posts/:id — get single post with kudos list and comments
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Validate UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: "Bulunamadi" }, { status: 404 });
  }

  // Optional auth
  let currentUserId: string | null = null;
  try {
    const user = await getRequestUser(request);
    if (user) currentUserId = user.id;
  } catch {}

  const [post] = await db
    .select({
      id: posts.id,
      memberId: posts.memberId,
      memberName: members.name,
      memberImage: members.image,
      text: posts.text,
      photoUrl: posts.photoUrl,
      photoUrl2: posts.photoUrl2,
      photoUrl3: posts.photoUrl3,
      privacy: posts.privacy,
      commentsEnabled: posts.commentsEnabled,
      createdAt: posts.createdAt,
      kudosCount: sql<number>`(SELECT COUNT(*)::int FROM ${postKudos} WHERE ${postKudos.postId} = ${posts.id})`,
      commentCount: sql<number>`(SELECT COUNT(*)::int FROM ${postComments} WHERE ${postComments.postId} = ${posts.id})`,
      hasKudosed: currentUserId
        ? sql<boolean>`EXISTS(SELECT 1 FROM ${postKudos} WHERE ${postKudos.postId} = ${posts.id} AND ${postKudos.memberId} = ${currentUserId})`
        : sql<boolean>`false`,
    })
    .from(posts)
    .innerJoin(members, eq(posts.memberId, members.id))
    .where(eq(posts.id, id))
    .limit(1);

  if (!post) {
    return NextResponse.json({ error: "Bulunamadi" }, { status: 404 });
  }

  // Privacy check
  const isOwner = currentUserId === post.memberId;
  if (!isOwner) {
    if (post.privacy === "private") {
      return NextResponse.json({ error: "Bulunamadi" }, { status: 404 });
    }
    if (post.privacy === "members" && !currentUserId) {
      return NextResponse.json({ error: "Bulunamadi" }, { status: 404 });
    }
  }

  // Get kudos list
  const kudosList = await db
    .select({
      id: postKudos.id,
      memberId: postKudos.memberId,
      memberName: members.name,
      memberImage: members.image,
      createdAt: postKudos.createdAt,
    })
    .from(postKudos)
    .innerJoin(members, eq(postKudos.memberId, members.id))
    .where(eq(postKudos.postId, id))
    .orderBy(postKudos.createdAt)
    .limit(100);

  // Get comments
  const commentsList = await db
    .select({
      id: postComments.id,
      memberId: postComments.memberId,
      memberName: members.name,
      memberImage: members.image,
      text: postComments.text,
      createdAt: postComments.createdAt,
    })
    .from(postComments)
    .innerJoin(members, eq(postComments.memberId, members.id))
    .where(eq(postComments.postId, id))
    .orderBy(postComments.createdAt)
    .limit(200);

  return NextResponse.json({ post, kudos: kudosList, comments: commentsList });
}

// DELETE /api/posts/:id — delete own post
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Giris yapmaniz gerekiyor" }, { status: 401 });

  const { id } = await params;

  const [existing] = await db
    .select({ id: posts.id, memberId: posts.memberId })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Bulunamadi" }, { status: 404 });
  }

  if (existing.memberId !== user.id) {
    return NextResponse.json({ error: "Bu islemi yapmaya yetkiniz yok" }, { status: 403 });
  }

  await db.delete(posts).where(eq(posts.id, id));

  return NextResponse.json({ success: true });
}
