import { db } from "@/lib/db";
import { badges, memberBadges, activities } from "@/db/schema";
import { eq, count, sum, notInArray } from "drizzle-orm";

export async function evaluateBadges(memberId: string, activityId?: string): Promise<string[]> {
  // Get all badges not yet earned
  const earnedBadgeIds = await db
    .select({ badgeId: memberBadges.badgeId })
    .from(memberBadges)
    .where(eq(memberBadges.memberId, memberId));

  const earnedIds = earnedBadgeIds.map((b) => b.badgeId);

  const unearnedBadges = earnedIds.length > 0
    ? await db.select().from(badges).where(notInArray(badges.id, earnedIds))
    : await db.select().from(badges);

  if (unearnedBadges.length === 0) return [];

  // Get member stats
  const [stats] = await db
    .select({
      totalRuns: count(),
      totalDistanceM: sum(activities.distanceM),
    })
    .from(activities)
    .where(eq(activities.memberId, memberId));

  // Get latest activity stats
  const [latest] = activityId
    ? await db.select().from(activities).where(eq(activities.id, activityId)).limit(1)
    : [null];

  const totalRuns = Number(stats?.totalRuns || 0);
  const totalDistanceM = Number(stats?.totalDistanceM || 0);
  const latestDistanceM = latest?.distanceM || 0;
  const latestPace = latest?.avgPaceSecKm || 999;

  const newBadges: string[] = [];

  for (const badge of unearnedBadges) {
    const val = badge.triggerValue || 0;
    let earned = false;

    switch (badge.triggerType) {
      case "first_run":
        earned = totalRuns >= 1;
        break;
      case "runs_count":
        earned = totalRuns >= val;
        break;
      case "total_distance":
        earned = totalDistanceM >= val;
        break;
      case "single_run_distance":
        earned = latestDistanceM >= val;
        break;
      case "pace_under":
        earned = latestPace > 0 && latestPace <= val;
        break;
      default:
        break;
    }

    if (earned) {
      try {
        await db.insert(memberBadges).values({
          memberId,
          badgeId: badge.id,
          activityId: activityId || null,
        });
        newBadges.push(badge.name);
      } catch {
        // Already earned (unique constraint)
      }
    }
  }

  return newBadges;
}
