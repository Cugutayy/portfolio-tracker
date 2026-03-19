import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/mobile-auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { db } from "@/lib/db";
import { stravaConnections } from "@/db/schema";
import { eq } from "drizzle-orm";
import { decryptAccessToken, decryptRefreshToken } from "@/lib/crypto";
import { revokeAccess, refreshAccessToken } from "@/lib/strava";

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const session = { user: { id: user.id } };  // compatibility shim

  const [conn] = await db
    .select({
      id: stravaConnections.id,
      stravaAthleteId: stravaConnections.stravaAthleteId,
      lastSyncAt: stravaConnections.lastSyncAt,
      backfillComplete: stravaConnections.backfillComplete,
      createdAt: stravaConnections.createdAt,
    })
    .from(stravaConnections)
    .where(eq(stravaConnections.memberId, session.user.id))
    .limit(1);

  if (!conn) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    athleteId: conn.stravaAthleteId,
    lastSyncAt: conn.lastSyncAt,
    backfillComplete: conn.backfillComplete,
    connectedAt: conn.createdAt,
  });
}

export async function DELETE(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const rateLimited = await checkRateLimit(`strava:${user.id}`, { maxRequests: 5, windowSec: 60 });
  if (rateLimited) return rateLimited;
  const session = { user: { id: user.id } };  // compatibility shim

  const [conn] = await db
    .select()
    .from(stravaConnections)
    .where(eq(stravaConnections.memberId, session.user.id))
    .limit(1);

  if (!conn) {
    return NextResponse.json({ error: "No Strava connection" }, { status: 404 });
  }

  try {
    // Try to revoke at Strava (best effort)
    try {
      const accessToken = decryptAccessToken(
        conn.accessTokenEnc,
        conn.tokenIv,
        conn.tokenTag,
      );
      await revokeAccess(accessToken);
    } catch {
      // If token is expired, try refresh first
      try {
        const freshToken = await refreshAccessToken(conn.id);
        await revokeAccess(freshToken);
      } catch {
        // Best effort — still delete locally
      }
    }

    // Delete the connection
    await db
      .delete(stravaConnections)
      .where(eq(stravaConnections.id, conn.id));

    return NextResponse.json({ disconnected: true });
  } catch (err) {
    console.error("Strava disconnect error:", err);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 },
    );
  }
}
