import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { processWebhookEvents } from "@/lib/webhookProcessor";
import { cacheInvalidate, CACHE_KEYS } from "@/lib/cache";

/**
 * Verify cron secret from either header format:
 * - `Authorization: Bearer <secret>` (Vercel Cron)
 * - `x-cron-secret: <secret>` (manual/legacy)
 */
function isCronAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) return true;

  const xCronSecret = request.headers.get("x-cron-secret");
  if (xCronSecret === cronSecret) return true;

  return false;
}

async function handleProcess(request: NextRequest) {
  const isCron = isCronAuthorized(request);

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

    // Invalidate caches if any events were processed
    if (result.processed > 0) {
      await Promise.all([
        cacheInvalidate(CACHE_KEYS.communityStats),
        cacheInvalidate("leaderboard:*", true),
      ]);
    }

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

/**
 * GET /api/strava/webhook/process — Vercel Cron trigger
 * POST /api/strava/webhook/process — Manual trigger
 */
export async function GET(request: NextRequest) {
  return handleProcess(request);
}

export async function POST(request: NextRequest) {
  return handleProcess(request);
}
