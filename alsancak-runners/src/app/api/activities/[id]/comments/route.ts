import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import { comments, members } from "@/db/schema";
import { eq } from "drizzle-orm";

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

  return NextResponse.json({ comment: { ...comment, memberName: member?.name } }, { status: 201 });
}
