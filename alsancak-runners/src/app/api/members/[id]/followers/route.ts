import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { follows, members } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: memberId } = await params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(memberId)) {
    return NextResponse.json({ users: [], hasMore: false });
  }

  const type = request.nextUrl.searchParams.get("type") || "followers";
  const limit = Math.min(100, Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") || "50")));
  const offset = Math.max(0, parseInt(request.nextUrl.searchParams.get("offset") || "0"));

  let users;
  if (type === "followers") {
    // People who follow this member
    users = await db
      .select({ id: members.id, name: members.name, image: members.image, bio: members.bio, lastActiveAt: members.lastActiveAt })
      .from(follows)
      .innerJoin(members, eq(follows.followerId, members.id))
      .where(eq(follows.followingId, memberId))
      .limit(limit + 1)
      .offset(offset);
  } else {
    // People this member follows
    users = await db
      .select({ id: members.id, name: members.name, image: members.image, bio: members.bio, lastActiveAt: members.lastActiveAt })
      .from(follows)
      .innerJoin(members, eq(follows.followingId, members.id))
      .where(eq(follows.followerId, memberId))
      .limit(limit + 1)
      .offset(offset);
  }

  const hasMore = users.length > limit;
  const trimmed = hasMore ? users.slice(0, limit) : users;
  const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;
  const withOnline = trimmed.map(({ lastActiveAt, ...u }) => ({
    ...u,
    isOnline: lastActiveAt ? Date.now() - new Date(lastActiveAt).getTime() < ONLINE_THRESHOLD_MS : false,
  }));

  return NextResponse.json({ users: withOnline, hasMore });
}
