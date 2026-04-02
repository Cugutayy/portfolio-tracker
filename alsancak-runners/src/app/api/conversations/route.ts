import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { conversations, conversationParticipants, members, messages } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getRequestUser } from "@/lib/mobile-auth";
import { checkRateLimit } from "@/lib/rateLimit";

// GET /api/conversations — list user's conversations
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const myConvs = await db
    .select({
      id: conversations.id,
      type: conversations.type,
      name: conversations.name,
      imageUrl: conversations.imageUrl,
      lastMessageAt: conversations.lastMessageAt,
      lastMessagePreview: conversations.lastMessagePreview,
      lastMessageBy: conversations.lastMessageBy,
      myLastRead: conversationParticipants.lastReadAt,
    })
    .from(conversationParticipants)
    .innerJoin(conversations, eq(conversationParticipants.conversationId, conversations.id))
    .where(eq(conversationParticipants.memberId, user.id))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(50);

  // For DMs, get the other participant's info
  const enriched = await Promise.all(myConvs.map(async (c) => {
    let otherUser = null;
    if (c.type === "direct") {
      const [other] = await db
        .select({ id: members.id, name: members.name, image: members.image })
        .from(conversationParticipants)
        .innerJoin(members, eq(conversationParticipants.memberId, members.id))
        .where(and(
          eq(conversationParticipants.conversationId, c.id),
          sql`${conversationParticipants.memberId} != ${user.id}`
        ))
        .limit(1);
      otherUser = other || null;
    }

    const hasUnread = c.lastMessageAt && c.myLastRead
      ? new Date(c.lastMessageAt) > new Date(c.myLastRead)
      : !!c.lastMessageAt;

    return {
      id: c.id,
      type: c.type,
      name: c.type === "direct" ? otherUser?.name : c.name,
      image: c.type === "direct" ? otherUser?.image : c.imageUrl,
      otherUserId: otherUser?.id || null,
      lastMessagePreview: c.lastMessagePreview,
      lastMessageAt: c.lastMessageAt,
      hasUnread,
    };
  }));

  return NextResponse.json({ conversations: enriched });
}

// POST /api/conversations — create conversation (DM or group)
export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const rateLimited = await checkRateLimit(`conv:create:${user.id}`, { maxRequests: 10, windowSec: 60 });
  if (rateLimited) return rateLimited;

  const body = await request.json();
  const { type, participantIds, name } = body;

  if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
    return NextResponse.json({ error: "participantIds required" }, { status: 400 });
  }

  // For DM: check if conversation already exists
  if (type === "direct" && participantIds.length === 1) {
    const targetId = participantIds[0];
    const existing = await db.execute(sql`
      SELECT cp1.conversation_id FROM conversation_participants cp1
      INNER JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
      INNER JOIN conversations c ON c.id = cp1.conversation_id
      WHERE cp1.member_id = ${user.id}
        AND cp2.member_id = ${targetId}
        AND c.type = 'direct'
      LIMIT 1
    `);

    if (existing.rows && existing.rows.length > 0) {
      return NextResponse.json({ conversationId: existing.rows[0].conversation_id });
    }
  }

  // Create conversation
  const [conv] = await db.insert(conversations).values({
    type: type || "direct",
    name: type === "group" ? name : null,
    createdBy: user.id,
  }).returning({ id: conversations.id });

  // Add creator + participants
  const allParticipants = [user.id, ...participantIds.filter((id: string) => id !== user.id)];
  for (const memberId of allParticipants) {
    await db.insert(conversationParticipants).values({
      conversationId: conv.id,
      memberId,
      role: memberId === user.id ? "owner" : "member",
    }).onConflictDoNothing();
  }

  return NextResponse.json({ conversationId: conv.id }, { status: 201 });
}
