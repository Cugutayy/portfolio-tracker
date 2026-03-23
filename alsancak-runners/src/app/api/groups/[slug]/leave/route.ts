import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import { groups, groupMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// POST /api/groups/[slug]/leave — leave a group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });

  const [group] = await db
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.slug, slug))
    .limit(1);

  if (!group) return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 });

  const [membership] = await db
    .select({ id: groupMembers.id, role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.memberId, user.id)))
    .limit(1);

  if (!membership) {
    return NextResponse.json({ error: "Bu grubun üyesi değilsiniz" }, { status: 400 });
  }

  if (membership.role === "owner") {
    return NextResponse.json(
      { error: "Grup sahibi gruptan ayrılamaz. Önce sahipliği devredin." },
      { status: 400 },
    );
  }

  await db
    .delete(groupMembers)
    .where(eq(groupMembers.id, membership.id));

  return NextResponse.json({ message: "Gruptan başarıyla ayrıldınız" });
}
