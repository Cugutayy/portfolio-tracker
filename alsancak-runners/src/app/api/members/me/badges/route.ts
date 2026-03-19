import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import { memberBadges, badges } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const earned = await db
    .select({
      id: memberBadges.id,
      earnedAt: memberBadges.earnedAt,
      activityId: memberBadges.activityId,
      badge: {
        id: badges.id,
        slug: badges.slug,
        name: badges.name,
        description: badges.description,
        iconEmoji: badges.iconEmoji,
        category: badges.category,
      },
    })
    .from(memberBadges)
    .innerJoin(badges, eq(memberBadges.badgeId, badges.id))
    .where(eq(memberBadges.memberId, user.id))
    .orderBy(memberBadges.earnedAt);

  return NextResponse.json({ badges: earned });
}
