import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { users, likes } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/social/like { handle } → toggle like on a portfolio
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me)
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });

  const { handle } = (await req.json().catch(() => ({}))) as { handle?: string };
  if (!handle)
    return NextResponse.json({ ok: false, error: "handle gerekli" }, { status: 400 });

  const [target] = await db.select().from(users).where(eq(users.handle, handle)).limit(1);
  if (!target)
    return NextResponse.json({ ok: false, error: "Kullanıcı bulunamadı" }, { status: 404 });

  const [existing] = await db
    .select()
    .from(likes)
    .where(and(eq(likes.userId, me.id), eq(likes.portfolioUserId, target.id)))
    .limit(1);

  let liked: boolean;
  if (existing) {
    await db
      .delete(likes)
      .where(and(eq(likes.userId, me.id), eq(likes.portfolioUserId, target.id)));
    liked = false;
  } else {
    await db.insert(likes).values({ userId: me.id, portfolioUserId: target.id });
    liked = true;
  }

  const [{ c }] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(likes)
    .where(eq(likes.portfolioUserId, target.id));

  return NextResponse.json({ ok: true, liked, likes: Number(c) });
}
