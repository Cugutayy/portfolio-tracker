import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import { posts, postKudos, postComments, members, follows } from "@/db/schema";
import { sql, eq, and } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rateLimit";

// Increase body size limit for photo uploads
export const maxDuration = 30; // seconds

// GET /api/posts — list posts (paginated, newest first)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
  const limit = Math.max(1, Math.min(50, parseInt(searchParams.get("limit") || "20") || 20));
  const filter = searchParams.get("filter") === "following" ? "following" : "everyone";
  const offset = (page - 1) * limit;

  // Optional auth for hasKudosed + following filter
  let currentUserId: string | null = null;
  try {
    const user = await getRequestUser(request);
    if (user) currentUserId = user.id;
  } catch {}

  // Build WHERE conditions
  const conditions = [];

  // Privacy filter
  if (currentUserId) {
    conditions.push(
      sql`(${posts.privacy} = 'public' OR ${posts.privacy} = 'members' OR ${posts.memberId} = ${currentUserId})`
    );
  } else {
    conditions.push(eq(posts.privacy, "public"));
  }

  // Following filter
  if (filter === "following" && currentUserId) {
    conditions.push(
      sql`(${posts.memberId} IN (SELECT ${follows.followingId} FROM ${follows} WHERE ${follows.followerId} = ${currentUserId}) OR ${posts.memberId} = ${currentUserId})`
    );
  }

  const rows = await db
    .select({
      id: posts.id,
      memberId: posts.memberId,
      memberName: members.name,
      memberImage: members.image,
      text: posts.text,
      photoUrl: posts.photoUrl,
      photoUrl2: posts.photoUrl2,
      photoUrl3: posts.photoUrl3,
      privacy: posts.privacy,
      commentsEnabled: posts.commentsEnabled,
      createdAt: posts.createdAt,
      kudosCount: sql<number>`(SELECT COUNT(*)::int FROM ${postKudos} WHERE ${postKudos.postId} = ${posts.id})`,
      commentCount: sql<number>`(SELECT COUNT(*)::int FROM ${postComments} WHERE ${postComments.postId} = ${posts.id})`,
      hasKudosed: currentUserId
        ? sql<boolean>`EXISTS(SELECT 1 FROM ${postKudos} WHERE ${postKudos.postId} = ${posts.id} AND ${postKudos.memberId} = ${currentUserId})`
        : sql<boolean>`false`,
    })
    .from(posts)
    .innerJoin(members, eq(posts.memberId, members.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${posts.createdAt} DESC`)
    .offset(offset)
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const trimmed = hasMore ? rows.slice(0, limit) : rows;

  return NextResponse.json({ posts: trimmed, hasMore });
}

// POST /api/posts — create a new post
export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Giris yapmaniz gerekiyor" }, { status: 401 });

  // Rate limit: 5 posts per hour
  const rateLimited = await checkRateLimit(`posts:create:${user.id}`, { maxRequests: 5, windowSec: 3600 });
  if (rateLimited) return rateLimited;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Gecersiz istek" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : null;
  const photoBase64 = typeof body.photoBase64 === "string" ? body.photoBase64 : null;
  const photoBase64_2 = typeof body.photoBase64_2 === "string" ? body.photoBase64_2 : null;
  const photoBase64_3 = typeof body.photoBase64_3 === "string" ? body.photoBase64_3 : null;
  const privacy = typeof body.privacy === "string" && ["public", "members", "private"].includes(body.privacy) ? body.privacy : "public";
  const commentsEnabled = body.commentsEnabled !== false;

  // Must have at least text or photo
  if (!text && !photoBase64) {
    return NextResponse.json({ error: "Yazi veya fotograf gerekli" }, { status: 400 });
  }

  // Validate text length
  if (text && text.length > 2000) {
    return NextResponse.json({ error: "Yazi en fazla 2000 karakter olabilir" }, { status: 400 });
  }

  // Validate photos
  const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_FORMATS = /^data:image\/(jpeg|png|webp|gif);base64,/;

  function validatePhoto(photo: string | null, label: string): string | null {
    if (!photo) return null;
    if (!ALLOWED_FORMATS.test(photo)) {
      return `${label}: Sadece JPEG, PNG, WebP veya GIF formatları kabul edilir`;
    }
    // Calculate base64 size (roughly 3/4 of string length after header)
    const base64Part = photo.split(",")[1] || "";
    const sizeBytes = (base64Part.length * 3) / 4;
    if (sizeBytes > MAX_PHOTO_SIZE) {
      return `${label}: Fotograf 1.4MB'dan küçük olmali`;
    }
    return null;
  }

  const photoErr1 = validatePhoto(photoBase64, "Fotograf 1");
  if (photoErr1) return NextResponse.json({ error: photoErr1 }, { status: 400 });

  const photoErr2 = validatePhoto(photoBase64_2, "Fotograf 2");
  if (photoErr2) return NextResponse.json({ error: photoErr2 }, { status: 400 });

  const photoErr3 = validatePhoto(photoBase64_3, "Fotograf 3");
  if (photoErr3) return NextResponse.json({ error: photoErr3 }, { status: 400 });

  const [post] = await db
    .insert(posts)
    .values({
      memberId: user.id,
      text: text || null,
      photoUrl: photoBase64 || null,
      photoUrl2: photoBase64_2 || null,
      photoUrl3: photoBase64_3 || null,
      privacy,
      commentsEnabled,
    })
    .returning();

  // Fetch member info for response
  const [member] = await db
    .select({ name: members.name, image: members.image })
    .from(members)
    .where(eq(members.id, user.id))
    .limit(1);

  return NextResponse.json({
    post: {
      ...post,
      memberName: member?.name || null,
      memberImage: member?.image || null,
      kudosCount: 0,
      commentCount: 0,
      hasKudosed: false,
    },
  }, { status: 201 });
}
