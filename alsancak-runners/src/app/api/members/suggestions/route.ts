import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { members, follows, activities } from "@/db/schema";
import { eq, sql, and, ne } from "drizzle-orm";
import { getRequestUser } from "@/lib/mobile-auth";

// GET /api/members/suggestions — suggest users to follow
// Logic: active users the current user does NOT follow, ordered by activity count
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const suggestions = await db
    .select({
      id: members.id,
      name: members.name,
      image: members.image,
      bio: members.bio,
      paceGroup: members.paceGroup,
      activityCount: sql<number>`(SELECT COUNT(*)::int FROM ${activities} WHERE ${activities.memberId} = ${members.id})`,
    })
    .from(members)
    .where(and(
      ne(members.id, user.id),
      sql`${members.id} NOT IN (SELECT ${follows.followingId} FROM ${follows} WHERE ${follows.followerId} = ${user.id})`,
      eq(members.privacy, "public"),
    ))
    .orderBy(sql`(SELECT COUNT(*) FROM ${activities} WHERE ${activities.memberId} = ${members.id}) DESC`)
    .limit(10);

  return NextResponse.json({ suggestions });
}
