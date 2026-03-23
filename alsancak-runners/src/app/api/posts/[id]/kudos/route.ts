import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import { posts, postKudos, members } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { sendPushNotification } from "@/lib/push";

// GET /api/posts/:id/kudos — list kudos on post
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = await params;

  const list = await db
    .select({
      id: postKudos.id,
      memberName: members.name,
      memberImage: members.image,
      memberId: postKudos.memberId,
      createdAt: postKudos.createdAt,
    })
    .from(postKudos)
    .innerJoin(members, eq(postKudos.memberId, members.id))
    .where(eq(postKudos.postId, postId))
    .orderBy(postKudos.createdAt)
    .limit(100);

  // Check if current user has kudosed
  let hasKudosed = false;
  try {
    const user = await getRequestUser(request);
    if (user) {
      const [existing] = await db
        .select({ id: postKudos.id })
        .from(postKudos)
        .where(and(eq(postKudos.postId, postId), eq(postKudos.memberId, user.id)))
        .limit(1);
      hasKudosed = !!existing;
    }
  } catch {}

  return NextResponse.json({ kudos: list, count: list.length, hasKudosed });
}

// POST /api/posts/:id/kudos — toggle kudos
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Giris yapmaniz gerekiyor" }, { status: 401 });

  const { id: postId } = await params;

  // Get the post
  const [post] = await db
    .select({ id: posts.id, memberId: posts.memberId })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!post) return NextResponse.json({ error: "Gonderi bulunamadi" }, { status: 404 });

  // Prevent self-kudos
  if (post.memberId === user.id) {
    return NextResponse.json({ error: "Kendi gonderine kudos veremezsin" }, { status: 400 });
  }

  // Check if already kudosed — atomic toggle
  const [existing] = await db
    .select({ id: postKudos.id })
    .from(postKudos)
    .where(and(eq(postKudos.postId, postId), eq(postKudos.memberId, user.id)))
    .limit(1);

  if (existing) {
    // Remove kudos
    await db.delete(postKudos).where(eq(postKudos.id, existing.id));
    const [{ value: newCount }] = await db.select({ value: count() }).from(postKudos).where(eq(postKudos.postId, postId));
    return NextResponse.json({ action: "removed", count: newCount, hasKudosed: false });
  } else {
    // Add kudos
    try {
      await db.insert(postKudos).values({ postId, memberId: user.id });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("duplicate") || msg.includes("unique")) {
        const [{ value: newCount }] = await db.select({ value: count() }).from(postKudos).where(eq(postKudos.postId, postId));
        return NextResponse.json({ action: "added", count: newCount, hasKudosed: true });
      }
      throw e;
    }
    const [{ value: newCount }] = await db.select({ value: count() }).from(postKudos).where(eq(postKudos.postId, postId));

    // Notify post owner (fire and forget)
    (async () => {
      try {
        const [owner] = await db
          .select({ pushToken: members.pushToken })
          .from(members)
          .where(eq(members.id, post.memberId))
          .limit(1);

        const [kudoser] = await db
          .select({ name: members.name })
          .from(members)
          .where(eq(members.id, user.id))
          .limit(1);

        if (owner?.pushToken && kudoser) {
          sendPushNotification(
            owner.pushToken,
            "Kudos!",
            `\u{1F44F} ${kudoser.name} gonderini beğendi!`,
            { type: "post_kudos", postId }
          );
        }
      } catch (e) {
        console.error("Post kudos push notification error:", e);
      }
    })();

    return NextResponse.json({ action: "added", count: newCount, hasKudosed: true });
  }
}
