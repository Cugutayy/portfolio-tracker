import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activities, members } from "@/db/schema";
import { sql, eq, and, gte, lte } from "drizzle-orm";
import { cacheGet, cacheSet, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

// GET /api/community/activities — community activities for Runs Explorer map
export async function GET(request: NextRequest) {
  // Rate limit by IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const rateLimited = await checkRateLimit(
    `community-activities:${ip}`,
    RATE_LIMITS.communityActivities
  );
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);
  const boundsParam = searchParams.get("bounds"); // swLng,swLat,neLng,neLat
  const period = searchParams.get("period") || "month";
  const type = searchParams.get("type") || "all";
  const runner = searchParams.get("runner");
  const limit = Math.min(200, parseInt(searchParams.get("limit") || "100"));
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0"));

  // Parse bounds
  let bounds: { swLng: number; swLat: number; neLng: number; neLat: number } | null = null;
  if (boundsParam) {
    const parts = boundsParam.split(",").map(Number);
    if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
      bounds = { swLng: parts[0], swLat: parts[1], neLng: parts[2], neLat: parts[3] };
    }
  }

  // Cache key from params
  const cacheHash = `${boundsParam || "all"}:${period}:${type}:${runner || ""}:${limit}:${offset}`;
  const cacheKey = CACHE_KEYS.communityActivities(cacheHash);
  const cached = await cacheGet<Record<string, unknown>>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
  }

  // Period start calculation
  const now = new Date();
  let periodStart: Date;
  switch (period) {
    case "week": {
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - now.getDay());
      periodStart.setHours(0, 0, 0, 0);
      break;
    }
    case "month": {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
    case "year": {
      periodStart = new Date(now.getFullYear(), 0, 1);
      break;
    }
    default: {
      periodStart = new Date(2020, 0, 1);
    }
  }

  // Build WHERE conditions
  const conditions = [
    eq(activities.sharedToBoard, true),
    // Only show activities from members with public/members privacy
    sql`${members.privacy} IN ('public', 'members')`,
    gte(activities.startTime, periodStart),
    sql`${activities.polylineEncoded} IS NOT NULL`,
    sql`${activities.startLat} IS NOT NULL`,
  ];

  if (bounds) {
    conditions.push(
      gte(activities.startLng, bounds.swLng),
      lte(activities.startLng, bounds.neLng),
      gte(activities.startLat, bounds.swLat),
      lte(activities.startLat, bounds.neLat)
    );
  }

  if (type !== "all") {
    const typeMap: Record<string, string[]> = {
      run: ["Run", "TrailRun", "VirtualRun"],
      walk: ["Walk", "Hike"],
    };
    const types = typeMap[type];
    if (types) {
      conditions.push(sql`${activities.activityType} IN (${sql.join(types.map(t => sql`${t}`), sql`, `)})`);
    }
  }

  if (runner) {
    conditions.push(eq(activities.memberId, runner));
  }

  // Query with member join
  const rows = await db
    .select({
      id: activities.id,
      memberId: activities.memberId,
      memberName: members.name,
      title: activities.title,
      activityType: activities.activityType,
      startTime: activities.startTime,
      distanceM: activities.distanceM,
      movingTimeSec: activities.movingTimeSec,
      avgPaceSecKm: activities.avgPaceSecKm,
      polylineEncoded: activities.polylineEncoded,
      startLat: activities.startLat,
      startLng: activities.startLng,
    })
    .from(activities)
    .innerJoin(members, eq(activities.memberId, members.id))
    .where(and(...conditions))
    .orderBy(sql`${activities.startTime} DESC`)
    .offset(offset)
    .limit(limit + 1); // +1 to check hasMore

  const hasMore = rows.length > limit;
  const trimmed = hasMore ? rows.slice(0, limit) : rows;

  const result = {
    activities: trimmed.map((row) => ({
      ...row,
      memberInitials: row.memberName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
    })),
    total: trimmed.length,
    hasMore,
  };

  await cacheSet(cacheKey, result, CACHE_TTL.communityActivities);

  return NextResponse.json(result, { headers: { "X-Cache": "MISS" } });
}
