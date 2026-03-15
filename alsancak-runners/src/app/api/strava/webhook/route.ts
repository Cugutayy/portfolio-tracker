import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stravaWebhookEvents } from "@/db/schema";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

/**
 * GET: Strava webhook verification handshake.
 * Strava sends hub.mode, hub.verify_token, hub.challenge.
 * We echo back the challenge to confirm the subscription.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ "hub.challenge": challenge });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * POST: Strava webhook event ingestion.
 * Fast ACK pattern: store raw payload → respond 200 immediately.
 * Processing happens asynchronously (via sync endpoint for now, BullMQ later).
 */
export async function POST(request: NextRequest) {
  // Rate limit: 100 webhook events per minute
  const rateLimited = await checkRateLimit(
    "webhook:strava",
    RATE_LIMITS.stravaWebhook
  );
  if (rateLimited) return rateLimited;

  try {
    const payload = await request.json();

    // Validate required fields
    const { object_type, object_id, aspect_type, owner_id, subscription_id, event_time } = payload;

    if (!object_type || !object_id || !aspect_type || !owner_id || !subscription_id) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Store raw event for processing
    await db.insert(stravaWebhookEvents).values({
      objectType: object_type,
      objectId: object_id,
      aspectType: aspect_type,
      ownerId: owner_id,
      subscriptionId: subscription_id,
      eventTime: event_time,
      updates: payload.updates || null,
      rawPayload: payload,
      status: "pending",
    });

    // Fast ACK — must respond within 2 seconds
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("Webhook ingestion error:", err);
    // Still return 200 to prevent Strava retries on our DB errors
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
