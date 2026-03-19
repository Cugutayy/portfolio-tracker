import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import { comments, members } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { cacheInvalidate } from "@/lib/cache";

// GET /api/activities/:id/comments
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: activityId } = await params;

  const list = await db
    .select({
      id: comments.id,
      text: comments.text,
      memberName: members.name,
      memberImage: members.image,
      memberId: comments.memberId,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .innerJoin(members, eq(comments.memberId, members.id))
    .where(eq(comments.activityId, activityId))
    .orderBy(comments.createdAt)
    .limit(200);

  return NextResponse.json({ comments: list });
}

// POST /api/activities/:id/comments
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: activityId } = await params;
  const body = await request.json();
  const text = body.text?.trim();

  if (!text || text.length < 1 || text.length > 500) {
    return NextResponse.json({ error: "Yorum 1-500 karakter olmali" }, { status: 400 });
  }

  // Strip any HTML tags
  const cleanText = text.replace(/<[^>]*>/g, '');

  const [comment] = await db
    .insert(comments)
    .values({ activityId, memberId: user.id, text: cleanText })
    .returning();

  // Fetch member name for response
  const [member] = await db
    .select({ name: members.name })
    .from(members)
    .where(eq(members.id, user.id))
    .limit(1);

  await cacheInvalidate("community:activities:*", true);
  return NextResponse.json({ comment: { ...comment, memberName: member?.name } }, { status: 201 });
}

// DELETE /api/activities/:id/comments
export async function DELETE(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { commentId } = body;

  if (!commentId) {
    return NextResponse.json({ error: "commentId is required" }, { status: 400 });
  }

  // Verify comment exists and belongs to the current user
  const [existing] = await db
    .select({ id: comments.id, memberId: comments.memberId })
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  if (existing.memberId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(comments).where(eq(comments.id, commentId));

  return NextResponse.json({ success: true });
}
