import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stravaConnections, activities, activitySplits } from "@/db/schema";
import { eq } from "drizzle-orm";
import { refreshAccessToken, stravaGet, speedToPace } from "@/lib/strava";
import type { StravaActivity } from "@/lib/strava";

const PAGE_SIZE = 30;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [conn] = await db
    .select()
    .from(stravaConnections)
    .where(eq(stravaConnections.memberId, session.user.id))
    .limit(1);

  if (!conn) {
    return NextResponse.json({ error: "No Strava connection" }, { status: 404 });
  }

  try {
    const accessToken = await refreshAccessToken(conn.id);

    // Fetch activities from Strava (most recent first)
    const after = conn.syncCursor
      ? String(conn.syncCursor)
      : String(Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60); // Last year

    const stravaActivities = await stravaGet<StravaActivity[]>(
      accessToken,
      "/athlete/activities",
      {
        after,
        per_page: String(PAGE_SIZE),
        page: "1",
      },
    );

    let synced = 0;
    let latestTime = conn.syncCursor || 0;

    for (const sa of stravaActivities) {
      // Only sync runs (and walks/hikes)
      const runTypes = ["Run", "TrailRun", "Walk", "Hike", "VirtualRun"];
      if (!runTypes.includes(sa.type) && !runTypes.includes(sa.sport_type)) {
        continue;
      }

      // Check if already exists
      const [existing] = await db
        .select({ id: activities.id })
        .from(activities)
        .where(eq(activities.stravaActivityId, sa.id))
        .limit(1);

      if (existing) continue;

      // Fetch detailed activity (includes splits)
      const detailed = await stravaGet<StravaActivity>(
        accessToken,
        `/activities/${sa.id}`,
      );

      // Normalize and insert
      const startTime = new Date(detailed.start_date);
      const activityType = detailed.type === "Run" || detailed.type === "VirtualRun"
        ? "run"
        : detailed.type.toLowerCase();

      const [inserted] = await db.insert(activities).values({
        memberId: session.user.id,
        stravaActivityId: detailed.id,
        source: "strava",
        title: detailed.name,
        activityType,
        startTime,
        elapsedTimeSec: detailed.elapsed_time,
        movingTimeSec: detailed.moving_time,
        distanceM: detailed.distance,
        elevationGainM: detailed.total_elevation_gain,
        avgPaceSecKm: speedToPace(detailed.average_speed),
        maxPaceSecKm: speedToPace(detailed.max_speed),
        avgHeartrate: detailed.average_heartrate ?? null,
        maxHeartrate: detailed.max_heartrate ?? null,
        calories: detailed.calories ?? null,
        avgCadence: detailed.average_cadence ?? null,
        polylineEncoded: detailed.map?.summary_polyline ?? null,
        startLat: detailed.start_latlng?.[0] ?? null,
        startLng: detailed.start_latlng?.[1] ?? null,
        endLat: detailed.end_latlng?.[0] ?? null,
        endLng: detailed.end_latlng?.[1] ?? null,
        city: "Izmir",
        privacy: "private",
        stravaRaw: detailed,
      }).returning({ id: activities.id });

      // Insert splits if available
      if (detailed.splits_metric && inserted) {
        const splitValues = detailed.splits_metric.map((s) => ({
          activityId: inserted.id,
          splitIndex: s.split,
          distanceM: s.distance,
          elapsedTimeSec: s.elapsed_time,
          movingTimeSec: s.moving_time,
          elevationDiffM: s.elevation_difference,
          avgPaceSecKm: speedToPace(s.average_speed) ?? 0,
          avgHeartrate: s.average_heartrate ?? null,
        }));

        if (splitValues.length > 0) {
          await db.insert(activitySplits).values(splitValues);
        }
      }

      const eventEpoch = Math.floor(startTime.getTime() / 1000);
      if (eventEpoch > latestTime) latestTime = eventEpoch;
      synced++;
    }

    // Update sync cursor
    if (latestTime > (conn.syncCursor || 0)) {
      await db
        .update(stravaConnections)
        .set({
          syncCursor: latestTime,
          lastSyncAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(stravaConnections.id, conn.id));
    }

    return NextResponse.json({
      synced,
      total: stravaActivities.length,
      hasMore: stravaActivities.length >= PAGE_SIZE,
    });
  } catch (err) {
    console.error("Strava sync error:", err);
    return NextResponse.json(
      { error: "Sync failed", details: err instanceof Error ? err.message : "Unknown" },
      { status: 500 },
    );
  }
}
