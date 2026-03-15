import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { processWebhookEvents } from "@/lib/webhookProcessor";

/**
 * POST /api/strava/webhook/process
 * Triggers processing of pending webhook events.
 * Requires admin role (or can be called by cron/BullMQ worker).
 */
export async function POST(request: Request) {
  // Check for cron secret (for Vercel Cron Jobs)
  const cronSecret = request.headers.get("x-cron-secret");
  const isCron = cronSecret === process.env.CRON_SECRET;

  if (!isCron) {
    // Require admin auth for manual triggering
    const session = await auth();
    const role = (session as unknown as Record<string, unknown>)?.role;
    if (!session?.user?.id || role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await processWebhookEvents();

    console.log("[webhook/process] Batch result:", result);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[webhook/process] Error:", err);
    return NextResponse.json(
      { error: "Processing failed", details: err instanceof Error ? err.message : "Unknown" },
      { status: 500 },
    );
  }
}
