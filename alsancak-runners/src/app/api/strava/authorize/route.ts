import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStravaAuthUrl } from "@/lib/strava";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { oauthStates } from "@/db/schema";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Generate cryptographic nonce
  const nonce = randomBytes(32).toString("hex");

  // Persist nonce server-side (expires in 10 minutes)
  await db.insert(oauthStates).values({
    memberId: session.user.id,
    nonce,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  // Mobile apps pass ?platform=mobile to get a JSON response instead of redirect
  const { searchParams } = new URL(request.url);
  const isMobile = searchParams.get("platform") === "mobile";

  // State = userId:nonce[:mobile] (verified in callback)
  const state = isMobile
    ? `${session.user.id}:${nonce}:mobile`
    : `${session.user.id}:${nonce}`;

  const origin = new URL(request.url).origin;
  const url = getStravaAuthUrl(state, origin);

  if (isMobile) {
    // Return the URL for the mobile app to open in a WebView/browser
    return NextResponse.json({ url });
  }

  return NextResponse.redirect(url);
}
