import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clubs, clubMembers } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { getRequestUser } from "@/lib/mobile-auth";
import { checkRateLimit } from "@/lib/rateLimit";

// GET /api/clubs - list clubs with member counts
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request).catch(() => null);

  const rows = await db
    .select({
      id: clubs.id,
      name: clubs.name,
      slug: clubs.slug,
      description: clubs.description,
      visibility: clubs.visibility,
      city: clubs.city,
      coverImageUrl: clubs.coverImageUrl,
      createdAt: clubs.createdAt,
      memberCount: sql<number>`(
        SELECT COUNT(*)::int
        FROM ${clubMembers}
        WHERE ${clubMembers.clubId} = ${clubs.id}
          AND ${clubMembers.status} = 'active'
      )`,
      isJoined: user
        ? sql<boolean>`EXISTS(
            SELECT 1 FROM ${clubMembers}
            WHERE ${clubMembers.clubId} = ${clubs.id}
              AND ${clubMembers.memberId} = ${user.id}
              AND ${clubMembers.status} = 'active'
          )`
        : sql<boolean>`false`,
    })
    .from(clubs)
    .where(
      user
        ? sql`${clubs.visibility} IN ('public', 'members')`
        : eq(clubs.visibility, "public"),
    )
    .orderBy(desc(clubs.createdAt))
    .limit(100);

  return NextResponse.json({ clubs: rows });
}

// POST /api/clubs - create a club
export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rateLimited = await checkRateLimit(`club:create:${user.id}`, {
    maxRequests: 5,
    windowSec: 3600,
    strict: true,
  });
  if (rateLimited) return rateLimited;

  const body = await request.json();
  const { name, description, visibility, city, coverImageUrl } = body || {};

  if (!name || typeof name !== "string" || name.trim().length < 3) {
    return NextResponse.json({ error: "Club name must be at least 3 characters" }, { status: 400 });
  }

  const safeVisibility = visibility === "members" ? "members" : "public";
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

  const [club] = await db
    .insert(clubs)
    .values({
      name: name.trim(),
      slug: `${slug}-${Date.now().toString(36)}`,
      description: description?.trim() || null,
      visibility: safeVisibility,
      city: city?.trim() || "Izmir",
      coverImageUrl: coverImageUrl || null,
      createdBy: user.id,
    })
    .returning({
      id: clubs.id,
      name: clubs.name,
      slug: clubs.slug,
      visibility: clubs.visibility,
      city: clubs.city,
    });

  await db.insert(clubMembers).values({
    clubId: club.id,
    memberId: user.id,
    role: "owner",
    status: "active",
  });

  return NextResponse.json({ club }, { status: 201 });
}
