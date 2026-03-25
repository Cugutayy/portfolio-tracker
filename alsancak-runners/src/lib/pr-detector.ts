import { db } from "@/lib/db";
import { personalRecords, activitySplits } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const STANDARD_DISTANCES: Record<string, number> = {
  "1K": 1000,
  "5K": 5000,
  "10K": 10000,
  "HM": 21097,
  "MARATHON": 42195,
};

interface PRResult {
  distance: string;
  timeSec: number;
  previousBestSec: number | null;
  improvement: number | null; // percentage
}

/**
 * After an activity is created, check if it sets any personal records
 * at standard distances (1K, 5K, 10K, HM, Marathon).
 *
 * Uses splits data for accuracy. Falls back to proportional estimate.
 */
export async function detectPersonalRecords(
  memberId: string,
  activityId: string,
  distanceM: number,
  movingTimeSec: number
): Promise<PRResult[]> {
  if (!memberId || !activityId || distanceM <= 0 || movingTimeSec <= 0) return [];

  const newPRs: PRResult[] = [];

  // Load splits for this activity (more accurate than proportional)
  const splits = await db
    .select({
      splitIndex: activitySplits.splitIndex,
      distanceM: activitySplits.distanceM,
      movingTimeSec: activitySplits.movingTimeSec,
    })
    .from(activitySplits)
    .where(eq(activitySplits.activityId, activityId))
    .orderBy(activitySplits.splitIndex);

  for (const [label, targetM] of Object.entries(STANDARD_DISTANCES)) {
    // Skip if activity is shorter than this distance
    if (distanceM < targetM * 0.95) continue; // 5% tolerance

    // Compute time for this distance
    let timeSec: number;

    if (splits.length >= 2) {
      // Use splits: accumulate until we reach targetM
      let cumDist = 0;
      let cumTime = 0;
      for (const s of splits) {
        cumDist += s.distanceM;
        cumTime += s.movingTimeSec;
        if (cumDist >= targetM) {
          // Interpolate if we overshot
          const overshoot = cumDist - targetM;
          const lastSplitPace = s.movingTimeSec / s.distanceM;
          timeSec = Math.round(cumTime - overshoot * lastSplitPace);
          break;
        }
      }
      // If splits didn't cover the distance, use proportional
      timeSec ??= Math.round((targetM / distanceM) * movingTimeSec);
    } else {
      // No splits — proportional estimate
      timeSec = Math.round((targetM / distanceM) * movingTimeSec);
    }

    if (timeSec <= 0) continue;

    // Check existing PR
    const [existing] = await db
      .select({ timeSec: personalRecords.timeSec })
      .from(personalRecords)
      .where(and(eq(personalRecords.memberId, memberId), eq(personalRecords.distance, label)))
      .limit(1);

    const previousBestSec = existing?.timeSec ?? null;

    // Only save if it's a new record (or first ever)
    if (previousBestSec === null || timeSec < previousBestSec) {
      const improvement = previousBestSec
        ? Number((((previousBestSec - timeSec) / previousBestSec) * 100).toFixed(1))
        : null;

      // Upsert: update if exists, insert if new
      if (existing) {
        await db
          .update(personalRecords)
          .set({
            timeSec,
            activityId,
            previousBestSec,
            improvement,
            createdAt: new Date(),
          })
          .where(and(eq(personalRecords.memberId, memberId), eq(personalRecords.distance, label)));
      } else {
        await db.insert(personalRecords).values({
          memberId,
          distance: label,
          timeSec,
          activityId,
          previousBestSec: null,
          improvement: null,
        });
      }

      newPRs.push({ distance: label, timeSec, previousBestSec, improvement });
    }
  }

  return newPRs;
}
