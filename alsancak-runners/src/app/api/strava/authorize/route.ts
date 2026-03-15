import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStravaAuthUrl } from "@/lib/strava";
import { randomBytes } from "crypto";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // State = userId:random (verified in callback)
  const state = `${session.user.id}:${randomBytes(16).toString("hex")}`;

  // Use request origin for correct redirect_uri in dev and production
  const origin = new URL(request.url).origin;
  const url = getStravaAuthUrl(state, origin);
  return NextResponse.redirect(url);
}
