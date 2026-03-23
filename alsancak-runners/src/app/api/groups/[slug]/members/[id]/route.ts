import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import { groups, groupMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const updateRoleSchema = z.object({
  role: z.enum(["admin", "member"]),
});

// DELETE /api/groups/[slug]/members/[id] — remove member (admin/owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id: targetMemberId } = await params;
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });

  const [group] = await db
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.slug, slug))
    .limit(1);

  if (!group) return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 });

  // Check caller is admin/owner
  const [callerMem] = await db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.memberId, user.id)))
    .limit(1);

  if (!callerMem || (callerMem.role !== "owner" && callerMem.role !== "admin")) {
    return NextResponse.json({ error: "Bu işlem için yetkiniz yok" }, { status: 403 });
  }

  // Check target member
  const [targetMem] = await db
    .select({ id: groupMembers.id, role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.memberId, targetMemberId)))
    .limit(1);

  if (!targetMem) return NextResponse.json({ error: "Üye bulunamadı" }, { status: 404 });

  if (targetMem.role === "owner") {
    return NextResponse.json({ error: "Grup sahibi çıkarılamaz" }, { status: 400 });
  }

  // Admin can't remove other admins
  if (targetMem.role === "admin" && callerMem.role !== "owner") {
    return NextResponse.json({ error: "Sadece grup sahibi adminleri çıkarabilir" }, { status: 403 });
  }

  await db.delete(groupMembers).where(eq(groupMembers.id, targetMem.id));

  return NextResponse.json({ message: "Üye gruptan çıkarıldı" });
}

// PATCH /api/groups/[slug]/members/[id] — change role (owner only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id: targetMemberId } = await params;
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });

  const [group] = await db
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.slug, slug))
    .limit(1);

  if (!group) return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 });

  // Only owner can change roles
  const [callerMem] = await db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.memberId, user.id)))
    .limit(1);

  if (!callerMem || callerMem.role !== "owner") {
    return NextResponse.json({ error: "Sadece grup sahibi rolleri değiştirebilir" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz rol" }, { status: 400 });
  }

  const [targetMem] = await db
    .select({ id: groupMembers.id, role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.memberId, targetMemberId)))
    .limit(1);

  if (!targetMem) return NextResponse.json({ error: "Üye bulunamadı" }, { status: 404 });

  if (targetMem.role === "owner") {
    return NextResponse.json({ error: "Grup sahibinin rolü değiştirilemez" }, { status: 400 });
  }

  await db
    .update(groupMembers)
    .set({ role: parsed.data.role })
    .where(eq(groupMembers.id, targetMem.id));

  return NextResponse.json({ message: "Rol güncellendi", role: parsed.data.role });
}
