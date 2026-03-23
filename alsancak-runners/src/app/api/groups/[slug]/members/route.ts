import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { groups, groupMembers, members } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

// GET /api/groups/[slug]/members — list group members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0"));

  const [group] = await db
    .select({ id: groups.id, visibility: groups.visibility })
    .from(groups)
    .where(eq(groups.slug, slug))
    .limit(1);

  if (!group) return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 });

  const rows = await db
    .select({
      id: members.id,
      name: members.name,
      image: members.image,
      role: groupMembers.role,
      joinedAt: groupMembers.joinedAt,
      lastActiveAt: members.lastActiveAt,
    })
    .from(groupMembers)
    .innerJoin(members, eq(groupMembers.memberId, members.id))
    .where(eq(groupMembers.groupId, group.id))
    .orderBy(sql`CASE ${groupMembers.role} WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, ${groupMembers.joinedAt} ASC`)
    .offset(offset)
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const trimmed = hasMore ? rows.slice(0, limit) : rows;

  const result = trimmed.map((row) => ({
    id: row.id,
    name: row.name,
    image: row.image,
    role: row.role,
    joinedAt: row.joinedAt,
    isOnline: row.lastActiveAt
      ? Date.now() - new Date(row.lastActiveAt).getTime() < ONLINE_THRESHOLD_MS
      : false,
  }));

  return NextResponse.json({ members: result, hasMore });
}
