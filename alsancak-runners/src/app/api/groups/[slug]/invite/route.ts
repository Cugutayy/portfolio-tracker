import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/mobile-auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { db } from "@/lib/db";
import { groups, groupMembers, groupInvites } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

// POST /api/groups/[slug]/invite — create invite code (admin/owner only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });

  const rateLimited = await checkRateLimit(`group-invite:${user.id}`, { maxRequests: 10, windowSec: 3600 });
  if (rateLimited) return rateLimited;

  const [group] = await db
    .select({ id: groups.id, slug: groups.slug })
    .from(groups)
    .where(eq(groups.slug, slug))
    .limit(1);

  if (!group) return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 });

  // Check admin/owner
  const [mem] = await db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.memberId, user.id)))
    .limit(1);

  if (!mem || (mem.role !== "owner" && mem.role !== "admin")) {
    return NextResponse.json({ error: "Bu işlem için yetkiniz yok" }, { status: 403 });
  }

  // Generate 8-char code
  const code = crypto.randomBytes(4).toString("hex");

  // Expires in 7 days
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const [invite] = await db
    .insert(groupInvites)
    .values({
      groupId: group.id,
      code,
      createdBy: user.id,
      expiresAt,
    })
    .returning();

  return NextResponse.json({
    code: invite.code,
    expiresAt: invite.expiresAt,
    link: `/groups/${group.slug}/join?code=${invite.code}`,
  }, { status: 201 });
}
