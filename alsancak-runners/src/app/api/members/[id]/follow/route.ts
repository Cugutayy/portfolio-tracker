import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import { follows } from "@/db/schema";
import { eq, and } from "drizzle-orm";

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
    return NextResponse.json({ action: "unfollowed" });
  } else {
    await db.insert(follows).values({ followerId: user.id, followingId: targetId });
    return NextResponse.json({ action: "followed" });
  }
}
