import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { kudos, comments, follows, members, activities } from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { getRequestUser } from "@/lib/mobile-auth";

// GET /api/notifications — aggregate recent interactions into notifications
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const notifications: Array<{
    id: string;
    type: string;
    actorName: string;
    actorImage: string | null;
    message: string;
    targetId: string | null;
    targetType: string | null;
    read: boolean;
    createdAt: string;
  }> = [];

  // Recent kudos on my activities
  try {
    const recentKudos = await db
      .select({
        id: kudos.id,
        actorName: members.name,
        actorImage: members.image,
        activityId: kudos.activityId,
        createdAt: kudos.createdAt,
      })
      .from(kudos)
      .innerJoin(activities, eq(kudos.activityId, activities.id))
      .innerJoin(members, eq(kudos.memberId, members.id))
      .where(and(
        eq(activities.memberId, user.id),
        sql`${kudos.memberId} != ${user.id}`,
      ))
      .orderBy(desc(kudos.createdAt))
      .limit(15);

    for (const k of recentKudos) {
      notifications.push({
        id: `kudos-${k.id}`,
        type: "kudos",
        actorName: k.actorName,
        actorImage: k.actorImage,
        message: "kosuna alkis verdi",
        targetId: k.activityId,
        targetType: "activity",
        read: true,
        createdAt: k.createdAt?.toISOString() || new Date().toISOString(),
      });
    }
  } catch {}

  // Recent comments on my activities
  try {
    const recentComments = await db
      .select({
        id: comments.id,
        actorName: members.name,
        actorImage: members.image,
        activityId: comments.activityId,
        text: comments.text,
        createdAt: comments.createdAt,
      })
      .from(comments)
      .innerJoin(activities, eq(comments.activityId, activities.id))
      .innerJoin(members, eq(comments.memberId, members.id))
      .where(and(
        eq(activities.memberId, user.id),
        sql`${comments.memberId} != ${user.id}`,
      ))
      .orderBy(desc(comments.createdAt))
      .limit(10);

    for (const c of recentComments) {
      notifications.push({
        id: `comment-${c.id}`,
        type: "comment",
        actorName: c.actorName,
        actorImage: c.actorImage,
        message: `yorum yapti: "${(c.text || "").slice(0, 50)}"`,
        targetId: c.activityId,
        targetType: "activity",
        read: true,
        createdAt: c.createdAt?.toISOString() || new Date().toISOString(),
      });
    }
  } catch {}

  // Recent followers
  try {
    const recentFollows = await db
      .select({
        id: follows.id,
        actorId: follows.followerId,
        actorName: members.name,
        actorImage: members.image,
        createdAt: follows.createdAt,
      })
      .from(follows)
      .innerJoin(members, eq(follows.followerId, members.id))
      .where(eq(follows.followingId, user.id))
      .orderBy(desc(follows.createdAt))
      .limit(10);

    for (const f of recentFollows) {
      notifications.push({
        id: `follow-${f.id}`,
        type: "follow",
        actorName: f.actorName,
        actorImage: f.actorImage,
        message: "seni takip etmeye basladi",
        targetId: f.actorId,
        targetType: "member",
        read: true,
        createdAt: f.createdAt?.toISOString() || new Date().toISOString(),
      });
    }
  } catch {}

  // Sort by date descending
  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ notifications: notifications.slice(0, 30) });
}
