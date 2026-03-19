import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import { comments, members, activities } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { cacheInvalidate } from "@/lib/cache";
import { sendPushNotification } from "@/lib/push";
import { checkRateLimit } from "@/lib/rateLimit";

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

  const rateLimited = await checkRateLimit(`comments:${user.id}`, { maxRequests: 20, windowSec: 60 });
  if (rateLimited) return rateLimited;

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

  // Notify activity owner if not self-comment (fire and forget)
  (async () => {
    try {
      const [activity] = await db
        .select({ memberId: activities.memberId })
        .from(activities)
        .where(eq(activities.id, activityId))
        .limit(1);

      if (activity && activity.memberId !== user.id) {
        const [owner] = await db
          .select({ pushToken: members.pushToken })
          .from(members)
          .where(eq(members.id, activity.memberId))
          .limit(1);

        if (owner?.pushToken) {
          sendPushNotification(
            owner.pushToken,
            "Yeni Yorum",
            `\u{1F4AC} ${member?.name || 'Biri'} ko\u015Funa yorum yapt\u0131`,
            { type: "comment", activityId }
          );
        }
      }
    } catch (e) {
      console.error("Comment push notification error:", e);
    }
  })();

  return NextResponse.json({ comment: { ...comment, memberName: member?.name } }, { status: 201 });
}

// DELETE /api/activities/:id/comments
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: activityId } = await params;
  const body = await request.json();
  const { commentId } = body;

  if (!commentId) {
    return NextResponse.json({ error: "commentId is required" }, { status: 400 });
  }

  // Verify comment exists and belongs to this activity
  const [existing] = await db
    .select({ id: comments.id, memberId: comments.memberId })
    .from(comments)
    .where(and(eq(comments.id, commentId), eq(comments.activityId, activityId)))
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
