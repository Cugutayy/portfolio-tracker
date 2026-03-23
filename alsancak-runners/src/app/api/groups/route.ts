import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser } from "@/lib/mobile-auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { db } from "@/lib/db";
import { groups, groupMembers, members } from "@/db/schema";
import { eq, sql, ilike, and } from "drizzle-orm";

const createGroupSchema = z.object({
  name: z.string().min(1, "Grup adı gerekli").max(100, "Grup adı en fazla 100 karakter"),
  description: z.string().max(500, "Açıklama en fazla 500 karakter").optional().nullable(),
  image: z.string().max(5_000_000).optional().nullable(),
  sportType: z.string().max(50).default("running"),
  city: z.string().max(100).optional().nullable(),
  visibility: z.enum(["public", "private"]).default("public"),
  postPolicy: z.enum(["everyone", "admins"]).default("everyone"),
});

// GET /api/groups — list groups with member counts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const sport = searchParams.get("sport");
  const city = searchParams.get("city");
  const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0"));

  const conditions = [eq(groups.visibility, "public")];

  if (q) {
    conditions.push(ilike(groups.name, `%${q}%`));
  }
  if (sport) {
    conditions.push(eq(groups.sportType, sport));
  }
  if (city) {
    conditions.push(eq(groups.city, city));
  }

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
      memberCount: sql<number>`(SELECT COUNT(*)::int FROM ${groupMembers} WHERE ${groupMembers.groupId} = ${groups.id})`,
    })
    .from(groups)
    .where(and(...conditions))
    .orderBy(sql`${groups.createdAt} DESC`)
    .offset(offset)
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const trimmed = hasMore ? rows.slice(0, limit) : rows;

  return NextResponse.json({ groups: trimmed, hasMore });
}

// POST /api/groups — create a new group
export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });

  const rateLimited = await checkRateLimit(`groups:create:${user.id}`, { maxRequests: 3, windowSec: 3600 });
  if (rateLimited) return rateLimited;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Doğrulama hatası", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { name, description, image, sportType, city, visibility, postPolicy } = parsed.data;

  // Generate slug (Turkish char support)
  const baseSlug = name
    .toLowerCase()
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i")
    .replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  // Create group then add owner membership (neon-http doesn't support transactions)
  const [group] = await db
    .insert(groups)
    .values({
      name,
      slug,
      description: description || null,
      image: image || null,
      sportType,
      city: city || null,
      visibility,
      postPolicy,
      createdBy: user.id,
    })
    .returning();

  await db.insert(groupMembers).values({
    groupId: group.id,
    memberId: user.id,
    role: "owner",
  });

  return NextResponse.json({ group: { ...group, memberCount: 1 } }, { status: 201 });
}
