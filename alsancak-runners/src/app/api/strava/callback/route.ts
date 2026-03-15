import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exchangeCode } from "@/lib/strava";
import { encryptTokenPair } from "@/lib/crypto";
import { db } from "@/lib/db";
import { stravaConnections } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/join", request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // User denied access
  if (error) {
    return NextResponse.redirect(
      new URL("/dashboard?strava=denied", request.url),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/dashboard?strava=error", request.url),
    );
  }

  // Verify state starts with user ID
  const [stateUserId] = state.split(":");
  if (stateUserId !== session.user.id) {
    return NextResponse.redirect(
      new URL("/dashboard?strava=error", request.url),
    );
  }

  try {
    // Exchange code for tokens
    const tokenData = await exchangeCode(code);

    // Encrypt tokens
    const encrypted = encryptTokenPair(
      tokenData.access_token,
      tokenData.refresh_token,
    );

    // Check if this Strava athlete is already connected to another account
    const [existing] = await db
      .select({ id: stravaConnections.id, memberId: stravaConnections.memberId })
      .from(stravaConnections)
      .where(eq(stravaConnections.stravaAthleteId, tokenData.athlete.id))
      .limit(1);

    if (existing && existing.memberId !== session.user.id) {
      return NextResponse.redirect(
        new URL("/dashboard?strava=already_linked", request.url),
      );
    }

    if (existing && existing.memberId === session.user.id) {
      // Update existing connection (re-auth)
      await db
        .update(stravaConnections)
        .set({
          ...encrypted,
          tokenExpiresAt: tokenData.expires_at,
          updatedAt: new Date(),
        })
        .where(eq(stravaConnections.id, existing.id));
    } else {
      // Create new connection
      await db.insert(stravaConnections).values({
        memberId: session.user.id,
        stravaAthleteId: tokenData.athlete.id,
        ...encrypted,
        tokenExpiresAt: tokenData.expires_at,
        scopes: "read,activity:read_all",
      });
    }

    return NextResponse.redirect(
      new URL("/dashboard?strava=connected", request.url),
    );
  } catch (err) {
    console.error("Strava callback error:", err);
    return NextResponse.redirect(
      new URL("/dashboard?strava=error", request.url),
    );
  }
}
