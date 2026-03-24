import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clubs, clubMembers } from "@/db/schema";
import { and, eq, count } from "drizzle-orm";
import { getRequestUser } from "@/lib/mobile-auth";
import { checkRateLimit } from "@/lib/rateLimit";

// POST /api/clubs/:id/join - join/leave toggle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rateLimited = await checkRateLimit(`club:join:${user.id}`, {
    maxRequests: 20,
    windowSec: 3600,
    strict: true,
  });
  if (rateLimited) return rateLimited;

  const { id: clubId } = await params;

  const [club] = await db
    .select({ id: clubs.id })
    .from(clubs)
    .where(eq(clubs.id, clubId))
    .limit(1);

  if (!club) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }

  const [existing] = await db
    .select({ id: clubMembers.id, status: clubMembers.status, role: clubMembers.role })
    .from(clubMembers)
    .where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.memberId, user.id)))
    .limit(1);

  if (existing) {
    // Owners cannot leave without ownership transfer
    if (existing.role === "owner" && existing.status === "active") {
      return NextResponse.json({ error: "Owner cannot leave the club" }, { status: 400 });
    }

    const newStatus = existing.status === "active" ? "left" : "active";
    await db
      .update(clubMembers)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(clubMembers.id, existing.id));

    const [{ value: memberCount }] = await db
      .select({ value: count() })
      .from(clubMembers)
      .where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.status, "active")));

    return NextResponse.json({
      action: newStatus === "active" ? "joined" : "left",
      memberCount: Number(memberCount),
    });
  }

  await db.insert(clubMembers).values({
    clubId,
    memberId: user.id,
    role: "member",
    status: "active",
  });

  const [{ value: memberCount }] = await db
    .select({ value: count() })
    .from(clubMembers)
    .where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.status, "active")));

  return NextResponse.json({ action: "joined", memberCount: Number(memberCount) }, { status: 201 });
}
