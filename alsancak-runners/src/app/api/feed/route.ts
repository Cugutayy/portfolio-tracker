import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { activities, follows, members } from "@/db/schema";
import { getRequestUser } from "@/lib/mobile-auth";
import { checkRateLimit } from "@/lib/rateLimit";

type FeedRow = {
  id: string;
  memberId: string;
  memberName: string;
  startTime: Date;
  distanceM: number;
  movingTimeSec: number;
  polylineEncoded: string | null;
  activityType: string;
};

type RankWeights = {
  recency: number;
  relationship: number;
  quality: number;
  diversity: number;
};

const DEFAULT_WEIGHTS: RankWeights = {
  recency: 0.4,
  relationship: 0.3,
  quality: 0.2,
  diversity: 0.1,
};

function parseRankWeights(): RankWeights {
  const raw = process.env.FEED_RANK_WEIGHTS;
  if (!raw) return DEFAULT_WEIGHTS;

  try {
    const parsed = JSON.parse(raw) as Partial<RankWeights>;
    const candidate: RankWeights = {
      recency: Number(parsed.recency ?? DEFAULT_WEIGHTS.recency),
      relationship: Number(parsed.relationship ?? DEFAULT_WEIGHTS.relationship),
      quality: Number(parsed.quality ?? DEFAULT_WEIGHTS.quality),
      diversity: Number(parsed.diversity ?? DEFAULT_WEIGHTS.diversity),
    };
    const total = candidate.recency + candidate.relationship + candidate.quality + candidate.diversity;
    if (Math.abs(total - 1) > 0.001) return DEFAULT_WEIGHTS;
    if (Object.values(candidate).some((n) => !Number.isFinite(n) || n < 0 || n > 1)) return DEFAULT_WEIGHTS;
    return candidate;
  } catch {
    return DEFAULT_WEIGHTS;
  }
}

function weekAgo(): Date {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

function calcRecencyScore(startTime: Date): number {
  const ageHours = Math.max(0, (Date.now() - new Date(startTime).getTime()) / (1000 * 60 * 60));
  return Math.max(0, Math.min(1, 1 - ageHours / 168)); // last 7 days
}

function calcQualityScore(row: FeedRow): number {
  const distanceScore = Math.min(1, row.distanceM / 15000);
  const telemetryScore = row.polylineEncoded ? 1 : 0.4;
  const effortScore = Math.min(1, row.movingTimeSec / 5400);
  return 0.45 * distanceScore + 0.35 * telemetryScore + 0.2 * effortScore;
}

// GET /api/feed
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rateLimited = await checkRateLimit(`feed:${user.id}`, {
    maxRequests: 60,
    windowSec: 60,
    strict: true,
  });
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "30", 10) || 30));
  const weights = parseRankWeights();

  const rows = await db
    .select({
      id: activities.id,
      memberId: activities.memberId,
      memberName: members.name,
      startTime: activities.startTime,
      distanceM: activities.distanceM,
      movingTimeSec: activities.movingTimeSec,
      polylineEncoded: activities.polylineEncoded,
      activityType: activities.activityType,
      isFollowing: sql<boolean>`EXISTS(
        SELECT 1 FROM ${follows}
        WHERE ${follows.followerId} = ${user.id}
          AND ${follows.followingId} = ${activities.memberId}
      )`,
    })
    .from(activities)
    .innerJoin(members, eq(members.id, activities.memberId))
    .where(
      and(
        gte(activities.startTime, weekAgo()),
        sql`(${activities.privacy} IN ('public', 'members') OR ${activities.memberId} = ${user.id})`,
        eq(activities.sharedToBoard, true),
      ),
    )
    .orderBy(desc(activities.startTime))
    .limit(limit * 3);

  const actorSeenCount = new Map<string, number>();
  const dedupeSeen = new Set<string>();

  const ranked = rows
    .map((row) => {
      const recency = calcRecencyScore(row.startTime);
      const relationship = row.memberId === user.id ? 1 : row.isFollowing ? 0.9 : 0.35;
      const quality = calcQualityScore(row as FeedRow);

      const prevActorCount = actorSeenCount.get(row.memberId) || 0;
      const diversity = Math.max(0, 1 - prevActorCount * 0.35);
      actorSeenCount.set(row.memberId, prevActorCount + 1);

      // S3 anti-spam: collapse duplicate low-value posts from same actor in short window
      const fifteenMinBucket = Math.floor(new Date(row.startTime).getTime() / (15 * 60 * 1000));
      const dedupeKey = `${row.memberId}:${row.activityType}:${fifteenMinBucket}`;
      const lowValue = quality < 0.45;
      const shouldCollapse = lowValue && dedupeSeen.has(dedupeKey);
      if (!shouldCollapse) dedupeSeen.add(dedupeKey);

      const score =
        weights.recency * recency +
        weights.relationship * relationship +
        weights.quality * quality +
        weights.diversity * diversity;

      return {
        id: row.id,
        itemType: "run_post",
        actor: {
          id: row.memberId,
          name: row.memberName,
          relationship: row.memberId === user.id ? "self" : row.isFollowing ? "following" : "community",
        },
        visibility: row.memberId === user.id ? "owner" : "members",
        createdAt: row.startTime,
        qualityScore: Number(quality.toFixed(3)),
        rankComponents: {
          recency: Number(recency.toFixed(3)),
          relationship: Number(relationship.toFixed(3)),
          quality: Number(quality.toFixed(3)),
          diversity: Number(diversity.toFixed(3)),
        },
        score: Number(score.toFixed(3)),
        antiSpam: {
          collapsedDuplicate: shouldCollapse,
          lowTelemetry: !row.polylineEncoded,
        },
        payload: {
          activityId: row.id,
          distanceM: row.distanceM,
          movingTimeSec: row.movingTimeSec,
          activityType: row.activityType,
        },
      };
    })
    .filter((item) => !item.antiSpam.collapsedDuplicate)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return NextResponse.json({
    feed: ranked,
    ranking: {
      version: "v1",
      formula: `${weights.recency}*recency + ${weights.relationship}*relationship + ${weights.quality}*quality + ${weights.diversity}*diversity`,
      lookbackDays: 7,
      weights,
    },
  });
}
