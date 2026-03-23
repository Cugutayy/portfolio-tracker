import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import { groups, groupMembers, activities, members } from "@/db/schema";
import { eq, sql, and, gte } from "drizzle-orm";

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  image: z.string().url().max(2000).optional().nullable(),
  sportType: z.string().max(50).optional(),
  city: z.string().max(100).optional().nullable(),
  visibility: z.enum(["public", "private"]).optional(),
  postPolicy: z.enum(["everyone", "admins"]).optional(),
});

// GET /api/groups/[slug] — group detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const [group] = await db
    .select({
      id: groups.id,
      name: groups.name,
      slug: groups.slug,
      description: groups.description,
      image: groups.image,
      sportType: groups.sportType,
      city: groups.city,
      visibility: groups.visibility,
      postPolicy: groups.postPolicy,
      createdBy: groups.createdBy,
      createdAt: groups.createdAt,
      memberCount: sql<number>`(SELECT COUNT(*)::int FROM ${groupMembers} WHERE ${groupMembers.groupId} = ${groups.id})`,
    })
    .from(groups)
    .where(eq(groups.slug, slug))
    .limit(1);

  if (!group) {
    return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 });
  }

  // Current user membership
  let membership: { role: string } | null = null;
  let currentUserId: string | null = null;
  try {
    const user = await getRequestUser(request);
    if (user) {
      currentUserId = user.id;
      const [mem] = await db
        .select({ role: groupMembers.role })
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.memberId, user.id)))
        .limit(1);
      if (mem) membership = mem;
    }
  } catch {}

  // If private and not a member, deny
  if (group.visibility === "private" && !membership) {
    return NextResponse.json({ error: "Bu grup özeldir" }, { status: 403 });
  }

  // Monthly stats: total runs this month, total distance
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [monthlyStats] = await db
    .select({
      totalRuns: sql<number>`COUNT(*)::int`,
      totalDistanceM: sql<number>`COALESCE(SUM(${activities.distanceM}), 0)::real`,
    })
    .from(activities)
    .where(
      and(
        sql`${activities.memberId} IN (SELECT ${groupMembers.memberId} FROM ${groupMembers} WHERE ${groupMembers.groupId} = ${group.id})`,
        gte(activities.startTime, monthStart),
      ),
    );

  return NextResponse.json({
    group: {
      ...group,
      stats: {
        totalMembers: group.memberCount,
        totalRunsThisMonth: monthlyStats?.totalRuns || 0,
        totalDistanceMThisMonth: monthlyStats?.totalDistanceM || 0,
      },
      currentUserRole: membership?.role || null,
      isMember: !!membership,
    },
  });
}

// PATCH /api/groups/[slug] — update group (admin/owner only)
export async function PATCH(
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

  // Check admin/owner
  const [mem] = await db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.memberId, user.id)))
    .limit(1);

  if (!mem || (mem.role !== "owner" && mem.role !== "admin")) {
    return NextResponse.json({ error: "Bu işlem için yetkiniz yok" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const parsed = updateGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Doğrulama hatası", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const data = parsed.data;
  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;
  if (data.image !== undefined) updates.image = data.image;
  if (data.sportType !== undefined) updates.sportType = data.sportType;
  if (data.city !== undefined) updates.city = data.city;
  if (data.visibility !== undefined) updates.visibility = data.visibility;
  if (data.postPolicy !== undefined) updates.postPolicy = data.postPolicy;

  const [updated] = await db
    .update(groups)
    .set(updates)
    .where(eq(groups.id, group.id))
    .returning();

  return NextResponse.json({ group: updated });
}
