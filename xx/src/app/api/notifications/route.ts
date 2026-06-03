import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { users, likes, comments } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getLeaderboard } from "@/lib/portfolio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/notifications → likes + comments on my portfolio + my live rank
export async function GET() {
  const me = await getCurrentUser();
  if (!me)
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });

  const [likeRows, commentRows, board] = await Promise.all([
    db
      .select({ name: users.name, handle: users.handle, image: users.image, at: likes.createdAt })
      .from(likes)
      .innerJoin(users, eq(users.id, likes.userId))
      .where(eq(likes.portfolioUserId, me.id))
      .orderBy(desc(likes.createdAt))
      .limit(20),
    db
      .select({ name: users.name, handle: users.handle, image: users.image, body: comments.body, at: comments.createdAt })
      .from(comments)
      .innerJoin(users, eq(users.id, comments.authorId))
      .where(eq(comments.portfolioUserId, me.id))
      .orderBy(desc(comments.createdAt))
      .limit(20),
    getLeaderboard(),
  ]);

  const rank = board.findIndex((r) => r.id === me.id) + 1;

  return NextResponse.json({
    ok: true,
    rank: rank || board.length,
    total: board.length,
    likes: likeRows.map((l) => ({ name: l.name, handle: l.handle, image: l.image, at: (l.at as Date).toISOString() })),
    comments: commentRows.map((c) => ({ name: c.name, handle: c.handle, image: c.image, body: c.body, at: (c.at as Date).toISOString() })),
  });
}
