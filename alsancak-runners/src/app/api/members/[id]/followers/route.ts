import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { follows, members } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: memberId } = await params;
  const type = request.nextUrl.searchParams.get("type") || "followers";

  let users;
  if (type === "followers") {
    // People who follow this member
    users = await db
      .select({ id: members.id, name: members.name, image: members.image, bio: members.bio })
      .from(follows)
      .innerJoin(members, eq(follows.followerId, members.id))
      .where(eq(follows.followingId, memberId));
  } else {
    // People this member follows
    users = await db
      .select({ id: members.id, name: members.name, image: members.image, bio: members.bio })
      .from(follows)
      .innerJoin(members, eq(follows.followingId, members.id))
      .where(eq(follows.followerId, memberId));
  }

  return NextResponse.json({ users });
}
