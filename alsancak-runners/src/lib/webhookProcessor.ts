import { db } from "./db";
import {
  stravaWebhookEvents,
  stravaConnections,
  activities,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { refreshAccessToken, stravaGet, speedToPace } from "./strava";
import type { StravaActivity } from "./strava";

const MAX_EVENTS_PER_BATCH = 20;
const MAX_ATTEMPTS = 3;

interface ProcessResult {
  processed: number;
  skipped: number;
  failed: number;
  errors: string[];
}

/**
 * Process pending webhook events.
 * Handles: activity.create, activity.update, activity.delete,
 *          athlete.update (deauthorization)
 */
export async function processWebhookEvents(): Promise<ProcessResult> {
  const result: ProcessResult = {
    processed: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  // Fetch pending events (oldest first, limited batch)
  const pendingEvents = await db
    .select()
    .from(stravaWebhookEvents)
    .where(eq(stravaWebhookEvents.status, "pending"))
    .orderBy(stravaWebhookEvents.createdAt)
    .limit(MAX_EVENTS_PER_BATCH);

  if (pendingEvents.length === 0) return result;

  for (const event of pendingEvents) {
    // Skip events that have exceeded max attempts
    if (event.attempts >= MAX_ATTEMPTS) {
      await db
        .update(stravaWebhookEvents)
        .set({ status: "failed", errorMessage: "Max attempts exceeded" })
        .where(eq(stravaWebhookEvents.id, event.id));
      result.skipped++;
      continue;
    }

    try {
      await processEvent(event);

      // Mark as processed
      await db
        .update(stravaWebhookEvents)
        .set({
          status: "processed",
          processedAt: new Date(),
          attempts: event.attempts + 1,
        })
        .where(eq(stravaWebhookEvents.id, event.id));

      result.processed++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error(
        `[webhook] Failed to process event ${event.id}:`,
        errorMsg,
      );

      // Increment attempts, keep as pending for retry
      await db
        .update(stravaWebhookEvents)
        .set({
          attempts: event.attempts + 1,
          errorMessage: errorMsg,
          status: event.attempts + 1 >= MAX_ATTEMPTS ? "failed" : "pending",
        })
        .where(eq(stravaWebhookEvents.id, event.id));

      result.failed++;
      result.errors.push(`Event ${event.id}: ${errorMsg}`);
    }
  }

  return result;
}

async function processEvent(
  event: typeof stravaWebhookEvents.$inferSelect,
): Promise<void> {
  if (event.objectType === "activity") {
    switch (event.aspectType) {
      case "create":
        await handleActivityCreate(event.ownerId, event.objectId);
        break;
      case "update":
        await handleActivityUpdate(event.ownerId, event.objectId);
        break;
      case "delete":
        await handleActivityDelete(event.objectId);
        break;
      default:
        console.warn(`[webhook] Unknown aspect_type: ${event.aspectType}`);
    }
  } else if (event.objectType === "athlete") {
    if (event.aspectType === "update") {
      await handleAthleteUpdate(event.ownerId, event.updates);
    }
  }
}

/**
 * Fetch activity from Strava and upsert into DB
 */
async function handleActivityCreate(
  ownerAthleteId: number,
  stravaActivityId: number,
): Promise<void> {
  // Find the connection for this athlete
  const [conn] = await db
    .select()
    .from(stravaConnections)
    .where(eq(stravaConnections.stravaAthleteId, ownerAthleteId))
    .limit(1);

  if (!conn) {
    throw new Error(`No connection for athlete ${ownerAthleteId}`);
  }

  // Check if activity already exists (idempotent)
  const [existing] = await db
    .select({ id: activities.id })
    .from(activities)
    .where(eq(activities.stravaActivityId, stravaActivityId))
    .limit(1);

  if (existing) return; // Already synced

  // Fetch activity from Strava
  const accessToken = await refreshAccessToken(conn.id);
  const sa = await stravaGet<StravaActivity>(
    accessToken,
    `/activities/${stravaActivityId}`,
  );

  // Only sync runs and related types
  const runTypes = ["Run", "TrailRun", "Walk", "Hike", "VirtualRun"];
  if (!runTypes.includes(sa.type) && !runTypes.includes(sa.sport_type)) {
    return; // Skip non-run activities
  }

  const startTime = new Date(sa.start_date);
  const activityType =
    sa.type === "Run" || sa.type === "VirtualRun"
      ? "run"
      : sa.type.toLowerCase();

  await db.insert(activities).values({
    memberId: conn.memberId,
    stravaActivityId: sa.id,
    source: "strava",
    title: sa.name,
    activityType,
    startTime,
    elapsedTimeSec: sa.elapsed_time,
    movingTimeSec: sa.moving_time,
    distanceM: sa.distance,
    elevationGainM: sa.total_elevation_gain,
    avgPaceSecKm: speedToPace(sa.average_speed),
    maxPaceSecKm: speedToPace(sa.max_speed),
    avgHeartrate: sa.average_heartrate ?? null,
    maxHeartrate: sa.max_heartrate ?? null,
    calories: sa.calories ?? null,
    avgCadence: sa.average_cadence ?? null,
    polylineEncoded: sa.map?.summary_polyline ?? null,
    startLat: sa.start_latlng?.[0] ?? null,
    startLng: sa.start_latlng?.[1] ?? null,
    endLat: sa.end_latlng?.[0] ?? null,
    endLng: sa.end_latlng?.[1] ?? null,
    city: "Izmir",
    privacy: "private",
  });
}

/**
 * Re-fetch and update an existing activity
 */
async function handleActivityUpdate(
  ownerAthleteId: number,
  stravaActivityId: number,
): Promise<void> {
  const [conn] = await db
    .select()
    .from(stravaConnections)
    .where(eq(stravaConnections.stravaAthleteId, ownerAthleteId))
    .limit(1);

  if (!conn) {
    throw new Error(`No connection for athlete ${ownerAthleteId}`);
  }

  // Check if activity exists locally
  const [existing] = await db
    .select({ id: activities.id })
    .from(activities)
    .where(eq(activities.stravaActivityId, stravaActivityId))
    .limit(1);

  if (!existing) {
    // Activity not synced yet — treat as create
    await handleActivityCreate(ownerAthleteId, stravaActivityId);
    return;
  }

  // Fetch updated data from Strava
  const accessToken = await refreshAccessToken(conn.id);
  const sa = await stravaGet<StravaActivity>(
    accessToken,
    `/activities/${stravaActivityId}`,
  );

  await db
    .update(activities)
    .set({
      title: sa.name,
      distanceM: sa.distance,
      elapsedTimeSec: sa.elapsed_time,
      movingTimeSec: sa.moving_time,
      elevationGainM: sa.total_elevation_gain,
      avgPaceSecKm: speedToPace(sa.average_speed),
      maxPaceSecKm: speedToPace(sa.max_speed),
      avgHeartrate: sa.average_heartrate ?? null,
      maxHeartrate: sa.max_heartrate ?? null,
      calories: sa.calories ?? null,
      polylineEncoded: sa.map?.summary_polyline ?? null,
      updatedAt: new Date(),
    })
    .where(eq(activities.stravaActivityId, stravaActivityId));
}

/**
 * Delete an activity that was deleted on Strava
 */
async function handleActivityDelete(
  stravaActivityId: number,
): Promise<void> {
  await db
    .delete(activities)
    .where(eq(activities.stravaActivityId, stravaActivityId));
}

/**
 * Handle athlete updates (e.g., deauthorization)
 */
async function handleAthleteUpdate(
  ownerAthleteId: number,
  updates: unknown,
): Promise<void> {
  const data = updates as Record<string, unknown> | null;

  // Strava sends authorized: "false" when user revokes
  if (data?.authorized === "false") {
    console.log(
      `[webhook] Athlete ${ownerAthleteId} revoked authorization. Removing connection.`,
    );

    const [conn] = await db
      .select({ id: stravaConnections.id })
      .from(stravaConnections)
      .where(eq(stravaConnections.stravaAthleteId, ownerAthleteId))
      .limit(1);

    if (conn) {
      await db
        .delete(stravaConnections)
        .where(eq(stravaConnections.id, conn.id));
    }
  }
}
