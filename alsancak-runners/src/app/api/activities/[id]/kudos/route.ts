import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import { kudos, members, activities } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";

// GET /api/activities/:id/kudos - list kudos for activity
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: activityId } = await params;

  const list = await db
    .select({
      id: kudos.id,
      memberName: members.name,
      memberImage: members.image,
      memberId: kudos.memberId,
      createdAt: kudos.createdAt
    })
    .from(kudos)
    .innerJoin(members, eq(kudos.memberId, members.id))
    .where(eq(kudos.activityId, activityId))
    .orderBy(kudos.createdAt)
    .limit(100);

  // Check if current user has kudosed
  let hasKudosed = false;
  try {
    const user = await getRequestUser(request);
    if (user) {
      const [existing] = await db
        .select({ id: kudos.id })
        .from(kudos)
        .where(and(eq(kudos.activityId, activityId), eq(kudos.memberId, user.id)))
        .limit(1);
      hasKudosed = !!existing;
    }
  } catch {}

  return NextResponse.json({ kudos: list, count: list.length, hasKudosed });
}

// POST /api/activities/:id/kudos - toggle kudos
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: activityId } = await params;

  // Prevent self-kudos (like Strava)
  const [activity] = await db
    .select({ memberId: activities.memberId })
    .from(activities)
    .where(eq(activities.id, activityId))
    .limit(1);

  if (!activity) return NextResponse.json({ error: "Activity not found" }, { status: 404 });
  if (activity.memberId === user.id) {
    return NextResponse.json({ error: "Kendi aktivitene kudos veremezsin" }, { status: 400 });
  }

  // Check if already kudosed
  const [existing] = await db
    .select({ id: kudos.id })
    .from(kudos)
    .where(and(eq(kudos.activityId, activityId), eq(kudos.memberId, user.id)))
    .limit(1);

  if (existing) {
    // Remove kudos
    await db.delete(kudos).where(eq(kudos.id, existing.id));
    const [{ value: newCount }] = await db.select({ value: count() }).from(kudos).where(eq(kudos.activityId, activityId));
    return NextResponse.json({ action: "removed", count: newCount, hasKudosed: false });
  } else {
    // Add kudos
    await db.insert(kudos).values({ activityId, memberId: user.id });
    const [{ value: newCount }] = await db.select({ value: count() }).from(kudos).where(eq(kudos.activityId, activityId));
    return NextResponse.json({ action: "added", count: newCount, hasKudosed: true });
  }
}
