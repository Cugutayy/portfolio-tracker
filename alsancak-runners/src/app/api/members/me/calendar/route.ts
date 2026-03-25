import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activities } from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { getRequestUser } from "@/lib/mobile-auth";

// GET /api/members/me/calendar?month=2026-03
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // "2026-03"

  const now = new Date();
  const year = month ? parseInt(month.split("-")[0]) : now.getFullYear();
  const mon = month ? parseInt(month.split("-")[1]) - 1 : now.getMonth();

  const startDate = new Date(year, mon, 1);
  const endDate = new Date(year, mon + 1, 0, 23, 59, 59);

  const days = await db
    .select({
      date: sql<string>`${activities.startTime}::date`,
      count: sql<number>`COUNT(*)::int`,
      totalDistanceM: sql<number>`COALESCE(SUM(${activities.distanceM}), 0)::int`,
    })
    .from(activities)
    .where(and(
      eq(activities.memberId, user.id),
      gte(activities.startTime, startDate),
      lte(activities.startTime, endDate),
    ))
    .groupBy(sql`${activities.startTime}::date`)
    .orderBy(sql`${activities.startTime}::date`);

  return NextResponse.json({ days, month: `${year}-${String(mon + 1).padStart(2, "0")}` });
}
