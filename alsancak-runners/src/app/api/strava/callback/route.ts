import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exchangeCode } from "@/lib/strava";
import { encryptTokenPair } from "@/lib/crypto";
import { db } from "@/lib/db";
import { stravaConnections, oauthStates, members } from "@/db/schema";
import { eq, and, lt } from "drizzle-orm";

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

  // Parse state = "userId:nonce"
  const colonIdx = state.indexOf(":");
  if (colonIdx === -1) {
    return NextResponse.redirect(
      new URL("/dashboard?strava=error", request.url),
    );
  }
  const stateUserId = state.slice(0, colonIdx);
  const stateNonce = state.slice(colonIdx + 1);

  // Verify user ID matches session
  if (stateUserId !== session.user.id) {
    return NextResponse.redirect(
      new URL("/dashboard?strava=error", request.url),
    );
  }

  // Verify nonce exists in DB and hasn't expired
  const [storedState] = await db
    .select()
    .from(oauthStates)
    .where(
      and(
        eq(oauthStates.memberId, session.user.id),
        eq(oauthStates.nonce, stateNonce),
      ),
    )
    .limit(1);

  if (!storedState || storedState.expiresAt < new Date()) {
    // Clean up expired state if it exists
    if (storedState) {
      await db.delete(oauthStates).where(eq(oauthStates.id, storedState.id));
    }
    return NextResponse.redirect(
      new URL("/dashboard?strava=error", request.url),
    );
  }

  // Delete the used nonce (one-time use)
  await db.delete(oauthStates).where(eq(oauthStates.id, storedState.id));

  // Clean up any expired states for this user (housekeeping)
  await db
    .delete(oauthStates)
    .where(
      and(
        eq(oauthStates.memberId, session.user.id),
        lt(oauthStates.expiresAt, new Date()),
      ),
    );

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
      .select({
        id: stravaConnections.id,
        memberId: stravaConnections.memberId,
      })
      .from(stravaConnections)
      .where(eq(stravaConnections.stravaAthleteId, tokenData.athlete.id))
      .limit(1);

    if (existing && existing.memberId !== session.user.id) {
      // Check if the existing connection belongs to a placeholder account
      // (created by Auth.js Strava sign-in flow). If so, reassign it.
      const [existingMember] = await db
        .select({ email: members.email })
        .from(members)
        .where(eq(members.id, existing.memberId))
        .limit(1);

      const isPlaceholder = existingMember?.email?.endsWith("@placeholder.local");

      if (isPlaceholder) {
        // Reassign the connection to the current user
        await db
          .update(stravaConnections)
          .set({
            memberId: session.user.id,
            ...encrypted,
            tokenExpiresAt: tokenData.expires_at,
            updatedAt: new Date(),
          })
          .where(eq(stravaConnections.id, existing.id));

        // Delete the orphaned placeholder member
        await db.delete(members).where(eq(members.id, existing.memberId));

        return NextResponse.redirect(
          new URL("/dashboard?strava=connected", request.url),
        );
      }

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
