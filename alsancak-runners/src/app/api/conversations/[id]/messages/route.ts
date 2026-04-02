import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages, conversations, conversationParticipants, members } from "@/db/schema";
import { eq, and, desc, lt } from "drizzle-orm";
import { getRequestUser } from "@/lib/mobile-auth";
import { checkRateLimit } from "@/lib/rateLimit";

// GET /api/conversations/:id/messages — get messages with pagination
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Verify user is participant
  const [participant] = await db
    .select({ id: conversationParticipants.id })
    .from(conversationParticipants)
    .where(and(
      eq(conversationParticipants.conversationId, id),
      eq(conversationParticipants.memberId, user.id),
    ))
    .limit(1);

  if (!participant) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const before = searchParams.get("before"); // cursor for pagination
  const limit = Math.min(50, parseInt(searchParams.get("limit") || "30"));

  const conditions = [
    eq(messages.conversationId, id),
    eq(messages.isDeleted, false),
  ];
  if (before) {
    conditions.push(lt(messages.createdAt, new Date(before)));
  }

  const msgs = await db
    .select({
      id: messages.id,
      content: messages.content,
      messageType: messages.messageType,
      mediaUrl: messages.mediaUrl,
      replyToId: messages.replyToId,
      isEdited: messages.isEdited,
      createdAt: messages.createdAt,
      senderId: messages.senderId,
      senderName: members.name,
      senderImage: members.image,
    })
    .from(messages)
    .innerJoin(members, eq(messages.senderId, members.id))
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(limit + 1);

  const hasMore = msgs.length > limit;
  const trimmed = hasMore ? msgs.slice(0, limit) : msgs;

  // Mark as read
  await db
    .update(conversationParticipants)
    .set({ lastReadAt: new Date() })
    .where(and(
      eq(conversationParticipants.conversationId, id),
      eq(conversationParticipants.memberId, user.id),
    ));

  return NextResponse.json({
    messages: trimmed.reverse(), // oldest first for chat display
    hasMore,
  });
}

// POST /api/conversations/:id/messages — send message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const rateLimited = await checkRateLimit(`msg:${user.id}`, { maxRequests: 30, windowSec: 60 });
  if (rateLimited) return rateLimited;

  // Verify participant
  const [participant] = await db
    .select({ id: conversationParticipants.id })
    .from(conversationParticipants)
    .where(and(
      eq(conversationParticipants.conversationId, id),
      eq(conversationParticipants.memberId, user.id),
    ))
    .limit(1);

  if (!participant) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  const body = await request.json();
  const { content, messageType, mediaUrl, replyToId } = body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  if (content.length > 2000) {
    return NextResponse.json({ error: "Message too long (max 2000)" }, { status: 400 });
  }

  // Create message
  const [msg] = await db.insert(messages).values({
    conversationId: id,
    senderId: user.id,
    content: content.trim(),
    messageType: messageType || "text",
    mediaUrl: mediaUrl || null,
    replyToId: replyToId || null,
  }).returning();

  // Update conversation denormalized fields
  await db
    .update(conversations)
    .set({
      lastMessageAt: new Date(),
      lastMessagePreview: content.trim().slice(0, 100),
      lastMessageBy: user.id,
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, id));

  // Mark sender as read
  await db
    .update(conversationParticipants)
    .set({ lastReadAt: new Date() })
    .where(and(
      eq(conversationParticipants.conversationId, id),
      eq(conversationParticipants.memberId, user.id),
    ));

  return NextResponse.json({ message: msg }, { status: 201 });
}
