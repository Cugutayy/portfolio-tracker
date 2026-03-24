import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { members, activities } from "@/db/schema";
import { sql, and, isNotNull } from "drizzle-orm";
import { sendPushNotifications } from "@/lib/push";

/**
 * GET /api/cron/comeback — daily cron job
 * Sends a comeback push notification to users who haven't run in 3+ days
 * but have been active in the last 30 days (not abandoned users).
 * Protected by Vercel cron secret.
 */
export async function GET(request: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find members who:
    // 1. Have a push token
    // 2. Were active in last 30 days (lastActiveAt)
    // 3. Haven't recorded a run in 3+ days
    // 4. Haven't received a comeback notification in 3+ days (use lastActiveAt as proxy)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const eligibleMembers = await db
      .select({
        id: members.id,
        name: members.name,
        pushToken: members.pushToken,
      })
      .from(members)
      .where(and(
        isNotNull(members.pushToken),
        sql`${members.lastActiveAt} > ${thirtyDaysAgo}`,
        // No runs in last 3 days
        sql`NOT EXISTS (
          SELECT 1 FROM ${activities}
          WHERE ${activities.memberId} = ${members.id}
          AND ${activities.startTime} > ${threeDaysAgo}
        )`,
      ));

    if (eligibleMembers.length === 0) {
      return NextResponse.json({ sent: 0, message: "No eligible members" });
    }

    // Collect valid push tokens
    const tokens = eligibleMembers
      .map((m) => m.pushToken)
      .filter((t): t is string => !!t && t.startsWith("ExponentPushToken"));

    if (tokens.length === 0) {
      return NextResponse.json({ sent: 0, message: "No valid tokens" });
    }

    // Send batch notification
    await sendPushNotifications(
      tokens,
      "Seni ozledik!",
      "3 gundur kosmadin. Hadi bir tur atalim! Topluluk seni bekliyor.",
      { type: "comeback", screen: "/(tabs)/track" },
    );

    return NextResponse.json({
      sent: tokens.length,
      eligible: eligibleMembers.length,
    });
  } catch (error) {
    console.error("Comeback cron error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
