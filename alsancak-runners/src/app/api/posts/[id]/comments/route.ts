import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import { posts, postComments, members } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rateLimit";
import { sendPushNotification } from "@/lib/push";

// GET /api/posts/:id/comments — list comments on post
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = await params;

  const list = await db
    .select({
      id: postComments.id,
      text: postComments.text,
      memberName: members.name,
      memberImage: members.image,
      memberId: postComments.memberId,
      createdAt: postComments.createdAt,
    })
    .from(postComments)
    .innerJoin(members, eq(postComments.memberId, members.id))
    .where(eq(postComments.postId, postId))
    .orderBy(postComments.createdAt)
    .limit(200);

  return NextResponse.json({ comments: list });
}

// POST /api/posts/:id/comments — add comment
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Giris yapmaniz gerekiyor" }, { status: 401 });

  const rateLimited = await checkRateLimit(`post-comments:${user.id}`, { maxRequests: 20, windowSec: 60 });
  if (rateLimited) return rateLimited;

  const { id: postId } = await params;

  // Check post exists and comments are enabled
  const [post] = await db
    .select({ id: posts.id, memberId: posts.memberId, commentsEnabled: posts.commentsEnabled })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!post) {
    return NextResponse.json({ error: "Gonderi bulunamadi" }, { status: 404 });
  }

  if (!post.commentsEnabled) {
    return NextResponse.json({ error: "Bu gonderiye yorum yapilamaz" }, { status: 403 });
  }

  const body = await request.json();
  const rawText = body.text?.trim();

  if (!rawText || rawText.length > 500) {
    return NextResponse.json({ error: "Yorum 1-500 karakter olmali" }, { status: 400 });
  }

  // Strip HTML tags
  const cleanText = rawText.replace(/<[^>]*>/g, "").trim();

  if (!cleanText || cleanText.length < 1) {
    return NextResponse.json({ error: "Yorum bos olamaz" }, { status: 400 });
  }

  const [comment] = await db
    .insert(postComments)
    .values({ postId, memberId: user.id, text: cleanText })
    .returning();

  // Fetch member name for response
  const [member] = await db
    .select({ name: members.name })
    .from(members)
    .where(eq(members.id, user.id))
    .limit(1);

  // Notify post owner if not self-comment (fire and forget)
  (async () => {
    try {
      if (post.memberId !== user.id) {
        const [owner] = await db
          .select({ pushToken: members.pushToken })
          .from(members)
          .where(eq(members.id, post.memberId))
          .limit(1);

        if (owner?.pushToken) {
          sendPushNotification(
            owner.pushToken,
            "Yeni Yorum",
            `\u{1F4AC} ${member?.name || "Biri"} gonderine yorum yapti`,
            { type: "post_comment", postId }
          );
        }
      }
    } catch (e) {
      console.error("Post comment push notification error:", e);
    }
  })();

  return NextResponse.json({ comment: { ...comment, memberName: member?.name } }, { status: 201 });
}

// DELETE /api/posts/:id/comments — delete own comment
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Giris yapmaniz gerekiyor" }, { status: 401 });

  const { id: postId } = await params;
  const body = await request.json();
  const { commentId } = body;

  if (!commentId) {
    return NextResponse.json({ error: "commentId gerekli" }, { status: 400 });
  }

  // Verify comment exists and belongs to this post
  const [existing] = await db
    .select({ id: postComments.id, memberId: postComments.memberId })
    .from(postComments)
    .where(and(eq(postComments.id, commentId), eq(postComments.postId, postId)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Yorum bulunamadi" }, { status: 404 });
  }

  if (existing.memberId !== user.id) {
    return NextResponse.json({ error: "Bu islemi yapmaya yetkiniz yok" }, { status: 403 });
  }

  await db.delete(postComments).where(eq(postComments.id, commentId));

  return NextResponse.json({ success: true });
}
