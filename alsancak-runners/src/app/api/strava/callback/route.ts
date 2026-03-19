import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exchangeCode } from "@/lib/strava";
import { encryptTokenPair } from "@/lib/crypto";
import { db } from "@/lib/db";
import { stravaConnections, oauthStates, members } from "@/db/schema";
import { eq, and, lt } from "drizzle-orm";

/** Redirect to web dashboard or mobile deep link based on OAuth state */
function redirectResult(
  request: NextRequest,
  isMobile: boolean,
  status: string,
) {
  if (isMobile) {
    return NextResponse.redirect(`rota://strava-callback?status=${status}`);
  }
  return NextResponse.redirect(
    new URL(`/dashboard?strava=${status}`, request.url),
  );
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/join", request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Parse state = "userId:nonce" or "userId:nonce:mobile"
  const stateParts = state?.split(":") ?? [];
  const isMobile = stateParts[2] === "mobile";

  // User denied access
  if (error) {
    return redirectResult(request, isMobile, "denied");
  }

  if (!code || !state || stateParts.length < 2) {
    return redirectResult(request, isMobile, "error");
  }

  const stateUserId = stateParts[0];
  const stateNonce = stateParts[1];

  // Verify user ID matches session
  if (stateUserId !== session.user.id) {
    return redirectResult(request, isMobile, "error");
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
    if (storedState) {
      await db.delete(oauthStates).where(eq(oauthStates.id, storedState.id));
    }
    return redirectResult(request, isMobile, "error");
  }

  // Delete the used nonce (one-time use)
  await db.delete(oauthStates).where(eq(oauthStates.id, storedState.id));

  // Clean up expired states
  await db
    .delete(oauthStates)
    .where(
      and(
        eq(oauthStates.memberId, session.user.id),
        lt(oauthStates.expiresAt, new Date()),
      ),
    );

  try {
    const tokenData = await exchangeCode(code);
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
      const [existingMember] = await db
        .select({ email: members.email })
        .from(members)
        .where(eq(members.id, existing.memberId))
        .limit(1);

      const isPlaceholder =
        existingMember?.email?.endsWith("@placeholder.local");

      if (isPlaceholder) {
        await db
          .update(stravaConnections)
          .set({
            memberId: session.user.id,
            ...encrypted,
            tokenExpiresAt: tokenData.expires_at,
            updatedAt: new Date(),
          })
          .where(eq(stravaConnections.id, existing.id));

        await db.delete(members).where(eq(members.id, existing.memberId));
        return redirectResult(request, isMobile, "connected");
      }

      return redirectResult(request, isMobile, "already_linked");
    }

    if (existing && existing.memberId === session.user.id) {
      await db
        .update(stravaConnections)
        .set({
          ...encrypted,
          tokenExpiresAt: tokenData.expires_at,
          updatedAt: new Date(),
        })
        .where(eq(stravaConnections.id, existing.id));
    } else {
      await db.insert(stravaConnections).values({
        memberId: session.user.id,
        stravaAthleteId: tokenData.athlete.id,
        ...encrypted,
        tokenExpiresAt: tokenData.expires_at,
        scopes: "read,activity:read_all",
      });
    }

    return redirectResult(request, isMobile, "connected");
  } catch (err) {
    console.error("Strava callback error:", err);
    return redirectResult(request, isMobile, "error");
  }
}
