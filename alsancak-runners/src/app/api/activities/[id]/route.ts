import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { activities, activitySplits } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const [activity] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.id, id), eq(activities.memberId, session.user.id)))
    .limit(1);

  if (!activity) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get splits
  const splits = await db
    .select()
    .from(activitySplits)
    .where(eq(activitySplits.activityId, id))
    .orderBy(asc(activitySplits.splitIndex));

  return NextResponse.json({ activity, splits });
}

// PATCH /api/activities/[id] — update activity (owner only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership
  const [existing] = await db
    .select({ id: activities.id, memberId: activities.memberId })
    .from(activities)
    .where(and(eq(activities.id, id), eq(activities.memberId, session.user.id)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const allowedFields: Record<string, unknown> = {};

  if (body.title !== undefined) allowedFields.title = body.title;
  if (body.privacy !== undefined) allowedFields.privacy = body.privacy;
  if (body.sharedToBoard !== undefined) allowedFields.sharedToBoard = body.sharedToBoard;

  if (Object.keys(allowedFields).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  await db
    .update(activities)
    .set({ ...allowedFields, updatedAt: new Date() })
    .where(eq(activities.id, id));

  return NextResponse.json({ success: true });
}

// DELETE /api/activities/[id] — delete activity (owner only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const [existing] = await db
    .select({ id: activities.id, memberId: activities.memberId })
    .from(activities)
    .where(and(eq(activities.id, id), eq(activities.memberId, session.user.id)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(activities).where(eq(activities.id, id));

  return NextResponse.json({ success: true });
}
