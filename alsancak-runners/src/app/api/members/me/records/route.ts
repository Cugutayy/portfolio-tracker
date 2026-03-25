import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { personalRecords, activities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getRequestUser } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const records = await db
    .select({
      id: personalRecords.id,
      distance: personalRecords.distance,
      timeSec: personalRecords.timeSec,
      activityId: personalRecords.activityId,
      previousBestSec: personalRecords.previousBestSec,
      improvement: personalRecords.improvement,
      createdAt: personalRecords.createdAt,
      activityTitle: activities.title,
      activityDate: activities.startTime,
    })
    .from(personalRecords)
    .leftJoin(activities, eq(personalRecords.activityId, activities.id))
    .where(eq(personalRecords.memberId, user.id))
    .orderBy(personalRecords.distance);

  return NextResponse.json({ records });
}
