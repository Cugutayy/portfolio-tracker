import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { members, groups, events, groupMembers } from "@/db/schema";
import { sql, ilike, eq, gte, and } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rateLimit";

// GET /api/search — global search across members, groups, events
export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimited = await checkRateLimit(`search:${ip}`, { maxRequests: 30, windowSec: 60 });
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const type = searchParams.get("type") || "all"; // members, groups, events, all
  const limit = Math.min(20, parseInt(searchParams.get("limit") || "10"));

  if (!q || q.length < 2) {
    return NextResponse.json({ error: "Arama terimi en az 2 karakter olmalı" }, { status: 400 });
  }

  const pattern = `%${q}%`;

  const result: {
    members?: Array<Record<string, unknown>>;
    groups?: Array<Record<string, unknown>>;
    events?: Array<Record<string, unknown>>;
  } = {};

  // Search members
  if (type === "all" || type === "members") {
    const memberRows = await db
      .select({
        id: members.id,
        name: members.name,
        image: members.image,
        paceGroup: members.paceGroup,
      })
      .from(members)
      .where(
        and(
          ilike(members.name, pattern),
          sql`${members.privacy} IN ('public', 'members')`,
        ),
      )
      .limit(limit);

    result.members = memberRows;
  }

  // Search groups
  if (type === "all" || type === "groups") {
    const groupRows = await db
      .select({
        id: groups.id,
        name: groups.name,
        slug: groups.slug,
        image: groups.image,
        sportType: groups.sportType,
        city: groups.city,
        memberCount: sql<number>`(SELECT COUNT(*)::int FROM ${groupMembers} WHERE ${groupMembers.groupId} = ${groups.id})`,
      })
      .from(groups)
      .where(
        and(
          ilike(groups.name, pattern),
          eq(groups.visibility, "public"),
        ),
      )
      .limit(limit);

    result.groups = groupRows;
  }

  // Search events
  if (type === "all" || type === "events") {
    const now = new Date();
    const eventRows = await db
      .select({
        id: events.id,
        title: events.title,
        slug: events.slug,
        date: events.date,
        meetingPoint: events.meetingPoint,
        eventType: events.eventType,
      })
      .from(events)
      .where(
        and(
          ilike(events.title, pattern),
          gte(events.date, now),
          eq(events.status, "upcoming"),
        ),
      )
      .orderBy(sql`${events.date} ASC`)
      .limit(limit);

    result.events = eventRows;
  }

  return NextResponse.json(result);
}
