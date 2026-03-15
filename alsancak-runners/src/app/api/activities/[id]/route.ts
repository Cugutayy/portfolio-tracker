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
