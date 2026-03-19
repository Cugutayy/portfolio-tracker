import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import { follows, members } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { sendPushNotification } from "@/lib/push";

// POST /api/members/:id/follow - toggle follow
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: targetId } = await params;

  if (targetId === user.id) {
    return NextResponse.json({ error: "Kendini takip edemezsin" }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: follows.id })
    .from(follows)
    .where(and(eq(follows.followerId, user.id), eq(follows.followingId, targetId)))
    .limit(1);

  if (existing) {
    await db.delete(follows).where(eq(follows.id, existing.id));
  } else {
    await db.insert(follows).values({ followerId: user.id, followingId: targetId });

    // Notify followed person (fire and forget)
    (async () => {
      try {
        const [target] = await db
          .select({ pushToken: members.pushToken })
          .from(members)
          .where(eq(members.id, targetId))
          .limit(1);

        const [follower] = await db
          .select({ name: members.name })
          .from(members)
          .where(eq(members.id, user.id))
          .limit(1);

        if (target?.pushToken && follower) {
          sendPushNotification(
            target.pushToken,
            "Yeni Takip\u00E7i",
            `\u{1F91D} ${follower.name} seni takip etmeye ba\u015Flad\u0131`,
            { type: "follow", followerId: user.id }
          );
        }
      } catch (e) {
        console.error("Follow push notification error:", e);
      }
    })();
  }

  const [{ value: followerCount }] = await db
    .select({ value: count() })
    .from(follows)
    .where(eq(follows.followingId, targetId));

  return NextResponse.json({
    action: existing ? "unfollowed" : "followed",
    followerCount: Number(followerCount),
  });
}
