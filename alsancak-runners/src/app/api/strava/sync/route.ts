import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import { stravaConnections, activities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { refreshAccessToken, stravaGet, speedToPace } from "@/lib/strava";
import type { StravaActivity } from "@/lib/strava";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { cacheInvalidate, CACHE_KEYS } from "@/lib/cache";

const PAGE_SIZE = 30;
const MAX_PAGES = 5; // 150 activities max per request

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const session = { user: { id: user.id } };  // compatibility shim

  // Rate limit: 5 syncs per minute per user
  const rateLimited = await checkRateLimit(
    `sync:${session.user.id}`,
    RATE_LIMITS.stravaSync
  );
  if (rateLimited) return rateLimited;

  const [conn] = await db
    .select()
    .from(stravaConnections)
    .where(eq(stravaConnections.memberId, session.user.id))
    .limit(1);

  if (!conn) {
    return NextResponse.json(
      { error: "No Strava connection" },
      { status: 404 },
    );
  }

  try {
    const accessToken = await refreshAccessToken(conn.id);

    // Cursor-based: fetch activities newer than last sync
    const after = conn.syncCursor
      ? String(conn.syncCursor)
      : String(Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60); // Last year

    let page = 1;
    let synced = 0;
    let totalFetched = 0;
    let latestTime = conn.syncCursor || 0;
    let hasMore = true;

    while (page <= MAX_PAGES && hasMore) {
      const batch = await stravaGet<StravaActivity[]>(
        accessToken,
        "/athlete/activities",
        {
          after,
          per_page: String(PAGE_SIZE),
          page: String(page),
        },
      );

      totalFetched += batch.length;
      hasMore = batch.length >= PAGE_SIZE;

      for (const sa of batch) {
        // Only sync runs (and walks/hikes)
        const runTypes = ["Run", "TrailRun", "Walk", "Hike", "VirtualRun"];
        if (
          !runTypes.includes(sa.type) &&
          !runTypes.includes(sa.sport_type)
        ) {
          continue;
        }

        // Insert from list data (no detail fetch — saves API quota)
        // Uses ON CONFLICT DO NOTHING for race-condition safety
        const startTime = new Date(sa.start_date);
        const activityType =
          sa.type === "Run" || sa.type === "VirtualRun"
            ? "run"
            : sa.type.toLowerCase();

        const inserted = await db
          .insert(activities)
          .values({
            memberId: session.user.id,
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
            city: sa.start_latlng ? null : null, // Derive from geocoding in future
            privacy: "private",
          })
          .onConflictDoNothing({ target: activities.stravaActivityId })
          .returning({ id: activities.id });

        if (inserted.length === 0) continue; // Already existed

        const eventEpoch = Math.floor(startTime.getTime() / 1000);
        if (eventEpoch > latestTime) latestTime = eventEpoch;
        synced++;
      }

      page++;
    }

    // Update sync cursor + mark backfill complete if no more pages
    if (latestTime > (conn.syncCursor || 0) || !hasMore) {
      await db
        .update(stravaConnections)
        .set({
          syncCursor:
            latestTime > (conn.syncCursor || 0)
              ? latestTime
              : conn.syncCursor,
          lastSyncAt: new Date(),
          backfillComplete: !hasMore,
          updatedAt: new Date(),
        })
        .where(eq(stravaConnections.id, conn.id));
    }

    // Invalidate cached community data after sync
    if (synced > 0) {
      await Promise.all([
        cacheInvalidate(CACHE_KEYS.communityStats),
        cacheInvalidate("leaderboard:*", true),
      ]);
    }

    return NextResponse.json({
      synced,
      total: totalFetched,
      hasMore,
    });
  } catch (err) {
    console.error("Strava sync error:", err);
    return NextResponse.json(
      {
        error: "Sync failed",
        details: err instanceof Error ? err.message : "Unknown",
      },
      { status: 500 },
    );
  }
}
