import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStravaAuthUrl } from "@/lib/strava";
import { randomBytes } from "crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // State = userId:random (verified in callback)
  const state = `${session.user.id}:${randomBytes(16).toString("hex")}`;

  const url = getStravaAuthUrl(state);
  return NextResponse.redirect(url);
}
