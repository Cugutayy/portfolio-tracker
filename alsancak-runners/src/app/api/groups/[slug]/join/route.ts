import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import { groups, groupMembers, groupInvites, members } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sendPushNotification } from "@/lib/push";

// POST /api/groups/[slug]/join — join a group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });

  const [group] = await db
    .select({ id: groups.id, name: groups.name, visibility: groups.visibility, createdBy: groups.createdBy })
    .from(groups)
    .where(eq(groups.slug, slug))
    .limit(1);

  if (!group) return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 });

  // Check already a member
  const [existing] = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.memberId, user.id)))
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: "Zaten bu grubun üyesisiniz" }, { status: 409 });
  }

  // Private group: require invite code
  if (group.visibility === "private") {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Davet kodu gerekli" }, { status: 400 });
    }

    const code = typeof body.code === "string" ? body.code.trim() : null;
    if (!code) {
      return NextResponse.json({ error: "Davet kodu gerekli" }, { status: 400 });
    }

    const [invite] = await db
      .select()
      .from(groupInvites)
      .where(and(eq(groupInvites.groupId, group.id), eq(groupInvites.code, code)))
      .limit(1);

    if (!invite) {
      return NextResponse.json({ error: "Geçersiz davet kodu" }, { status: 400 });
    }

    if (invite.usedBy) {
      return NextResponse.json({ error: "Bu davet kodu zaten kullanılmış" }, { status: 400 });
    }

    if (new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Davet kodu süresi dolmuş" }, { status: 400 });
    }

    // Mark invite as used
    await db
      .update(groupInvites)
      .set({ usedBy: user.id, usedAt: new Date() })
      .where(eq(groupInvites.id, invite.id));
  }

  // Add member
  await db.insert(groupMembers).values({
    groupId: group.id,
    memberId: user.id,
    role: "member",
  });

  // Notify group owner (fire and forget)
  (async () => {
    try {
      const [owner] = await db
        .select({ pushToken: members.pushToken })
        .from(members)
        .where(eq(members.id, group.createdBy))
        .limit(1);

      const [joiner] = await db
        .select({ name: members.name })
        .from(members)
        .where(eq(members.id, user.id))
        .limit(1);

      if (owner?.pushToken && joiner) {
        sendPushNotification(
          owner.pushToken,
          "Yeni Üye",
          `${joiner.name} "${group.name}" grubuna katıldı`,
          { type: "group_join", groupId: group.id },
        );
      }
    } catch (e) {
      console.error("Group join push notification error:", e);
    }
  })();

  return NextResponse.json({ message: "Gruba başarıyla katıldınız" });
}
