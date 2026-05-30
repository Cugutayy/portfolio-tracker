import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { users, comments } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/social/comment?handle=foo → comments (chronological) with authors
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const handle = searchParams.get("handle");
  if (!handle)
    return NextResponse.json({ ok: false, error: "handle gerekli" }, { status: 400 });

  const [target] = await db.select().from(users).where(eq(users.handle, handle)).limit(1);
  if (!target)
    return NextResponse.json({ ok: false, error: "Kullanıcı bulunamadı" }, { status: 404 });

  const rows = await db
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      authorName: users.name,
      authorHandle: users.handle,
      authorImage: users.image,
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(eq(comments.portfolioUserId, target.id))
    .orderBy(asc(comments.createdAt));

  return NextResponse.json({ ok: true, comments: rows });
}

// POST /api/social/comment { handle, body } → create, returns the new comment
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me)
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });

  const { handle, body } = (await req.json().catch(() => ({}))) as {
    handle?: string;
    body?: string;
  };
  const text = (body ?? "").trim();
  if (!handle)
    return NextResponse.json({ ok: false, error: "handle gerekli" }, { status: 400 });
  if (!text)
    return NextResponse.json({ ok: false, error: "Yorum boş olamaz" }, { status: 400 });
  if (text.length > 500)
    return NextResponse.json({ ok: false, error: "Yorum çok uzun (maks. 500)" }, { status: 400 });

  const [target] = await db.select().from(users).where(eq(users.handle, handle)).limit(1);
  if (!target)
    return NextResponse.json({ ok: false, error: "Kullanıcı bulunamadı" }, { status: 404 });

  const [row] = await db
    .insert(comments)
    .values({ authorId: me.id, portfolioUserId: target.id, body: text })
    .returning();

  return NextResponse.json({
    ok: true,
    comment: {
      id: row.id,
      body: row.body,
      createdAt: row.createdAt,
      authorName: me.name,
      authorHandle: me.handle,
      authorImage: me.image,
    },
  });
}
