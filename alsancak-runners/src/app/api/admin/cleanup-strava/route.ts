import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { members, stravaConnections } from "@/db/schema";
import { eq, like } from "drizzle-orm";
import {
  decryptAccessToken,
  decryptRefreshToken,
} from "@/lib/crypto";
import { revokeAccess, refreshAccessToken } from "@/lib/strava";

/**
 * POST /api/admin/cleanup-strava
 * Admin-only endpoint to clean up orphaned placeholder Strava accounts.
 * - Finds members with @placeholder.local emails that have Strava connections
 * - Revokes Strava access tokens (frees up connected athlete slots)
 * - Deletes the connections and placeholder members
 */
export async function POST(request: NextRequest) {
  // Auth: admin role or CRON_SECRET header
  const cronSecret = request.headers.get("x-cron-secret");
  const isValidCron =
    cronSecret && process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET;

  if (!isValidCron) {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    // Check admin role
    const [member] = await db
      .select({ role: members.role })
      .from(members)
      .where(eq(members.id, session.user.id))
      .limit(1);

    if (member?.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
  }

  // Find all placeholder members
  const placeholderMembers = await db
    .select({
      id: members.id,
      email: members.email,
    })
    .from(members)
    .where(like(members.email, "%@placeholder.local"));

  if (placeholderMembers.length === 0) {
    return NextResponse.json({
      message: "No placeholder accounts found",
      cleaned: 0,
    });
  }

  let cleaned = 0;
  let revoked = 0;
  const errors: string[] = [];

  for (const pm of placeholderMembers) {
    // Find associated Strava connection
    const [conn] = await db
      .select()
      .from(stravaConnections)
      .where(eq(stravaConnections.memberId, pm.id))
      .limit(1);

    if (conn) {
      // Try to revoke Strava access (frees up connected athlete slot)
      try {
        const accessToken = decryptAccessToken(
          conn.accessTokenEnc,
          conn.tokenIv,
          conn.tokenTag,
        );
        await revokeAccess(accessToken);
        revoked++;
      } catch {
        // Token expired — try refresh then revoke
        try {
          const freshToken = await refreshAccessToken(conn.id);
          await revokeAccess(freshToken);
          revoked++;
        } catch {
          errors.push(`Could not revoke athlete ${conn.stravaAthleteId}`);
        }
      }

      // Delete the connection
      await db
        .delete(stravaConnections)
        .where(eq(stravaConnections.id, conn.id));
    }

    // Delete the placeholder member
    await db.delete(members).where(eq(members.id, pm.id));
    cleaned++;
  }

  return NextResponse.json({
    message: `Cleaned ${cleaned} placeholder accounts, revoked ${revoked} Strava connections`,
    cleaned,
    revoked,
    errors: errors.length > 0 ? errors : undefined,
  });
}
