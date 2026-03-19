import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import { activities, activitySplits } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rateLimit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const session = { user: { id: user.id } };  // compatibility shim

  const { id } = await params;

  // First try to find the activity (visible to anyone for public/members activities)
  const [activity] = await db
    .select()
    .from(activities)
    .where(eq(activities.id, id))
    .limit(1);

  if (!activity) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Privacy check: only owner can see private activities
  const isOwner = activity.memberId === session.user.id;
  if (!isOwner && activity.privacy === "private") {
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
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const rateLimited = await checkRateLimit(`activity:${user.id}`, { maxRequests: 30, windowSec: 60 });
  if (rateLimited) return rateLimited;
  const session = { user: { id: user.id } };  // compatibility shim

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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const rateLimited = await checkRateLimit(`activity:${user.id}`, { maxRequests: 10, windowSec: 60 });
  if (rateLimited) return rateLimited;
  const session = { user: { id: user.id } };  // compatibility shim

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
