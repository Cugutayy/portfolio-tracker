import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import { groups, groupMembers } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

// GET /api/groups/my — list groups where current user is a member
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });

  const rows = await db
    .select({
      id: groups.id,
      name: groups.name,
      slug: groups.slug,
      description: groups.description,
      image: groups.image,
      sportType: groups.sportType,
      city: groups.city,
      visibility: groups.visibility,
      createdAt: groups.createdAt,
      role: groupMembers.role,
      joinedAt: groupMembers.joinedAt,
      memberCount: sql<number>`(SELECT COUNT(*)::int FROM group_members gm2 WHERE gm2.group_id = ${groups.id})`,
    })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(eq(groupMembers.memberId, user.id))
    .orderBy(sql`${groupMembers.joinedAt} DESC`);

  return NextResponse.json({ groups: rows });
}
