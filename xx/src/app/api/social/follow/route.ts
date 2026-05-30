import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { users, follows } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/social/follow { handle } → toggle follow
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
  if (target.id === me.id)
    return NextResponse.json({ ok: false, error: "Kendini takip edemezsin" }, { status: 422 });

  const [existing] = await db
    .select()
    .from(follows)
    .where(and(eq(follows.followerId, me.id), eq(follows.followingId, target.id)))
    .limit(1);

  let following: boolean;
  if (existing) {
    await db
      .delete(follows)
      .where(and(eq(follows.followerId, me.id), eq(follows.followingId, target.id)));
    following = false;
  } else {
    await db.insert(follows).values({ followerId: me.id, followingId: target.id });
    following = true;
  }

  const [{ c }] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(follows)
    .where(eq(follows.followingId, target.id));

  return NextResponse.json({ ok: true, following, followers: Number(c) });
}
