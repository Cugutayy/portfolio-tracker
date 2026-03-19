import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";

// POST /api/members/me/push-token — register push notification token
export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const session = { user: { id: user.id } };  // compatibility shim

  const body = await request.json();
  const { token, platform } = body;

  if (!token || !platform || !["ios", "android"].includes(platform)) {
    return NextResponse.json(
      { error: "Required: token (string), platform ('ios' | 'android')" },
      { status: 400 }
    );
  }

  await db
    .update(members)
    .set({
      pushToken: token,
      pushPlatform: platform,
      updatedAt: new Date(),
    })
    .where(eq(members.id, session.user.id));

  return NextResponse.json({ success: true });
}

// DELETE /api/members/me/push-token — unregister push token
export async function DELETE(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const session = { user: { id: user.id } };  // compatibility shim

  await db
    .update(members)
    .set({
      pushToken: null,
      pushPlatform: null,
      updatedAt: new Date(),
    })
    .where(eq(members.id, session.user.id));

  return NextResponse.json({ success: true });
}
