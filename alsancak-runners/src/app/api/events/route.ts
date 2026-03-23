import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser } from "@/lib/mobile-auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { db } from "@/lib/db";
import { events, eventRsvps, members, follows } from "@/db/schema";
import { eq, gte, asc, desc, sql, and } from "drizzle-orm";
import { sendPushNotifications } from "@/lib/push";

const createEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional().nullable(),
  eventType: z.string().default("group_run"),
  date: z.string().min(1, "Date is required"),
  meetingPoint: z.string().max(500).optional().nullable(),
  meetingLat: z.number().min(-90).max(90).optional().nullable(),
  meetingLng: z.number().min(-180).max(180).optional().nullable(),
  distanceM: z.number().positive().max(200000).optional().nullable(),
  paceGroups: z.any().optional().nullable(),
  maxParticipants: z.number().int().positive().max(1000).optional().nullable(),
  coverImageUrl: z.string().url().max(2000).optional().nullable(),
  routeId: z.string().uuid().optional().nullable(),
});

// GET /api/events — list upcoming events (public) or all for admin
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "upcoming";
  const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));

  // Try to get current user (optional — public endpoint)
  const user = await getRequestUser(request).catch(() => null);

  const now = new Date();

  const results = await db
    .select({
      id: events.id,
      title: events.title,
      slug: events.slug,
      description: events.description,
      eventType: events.eventType,
      date: events.date,
      meetingPoint: events.meetingPoint,
      meetingLat: events.meetingLat,
      meetingLng: events.meetingLng,
      distanceM: events.distanceM,
      paceGroups: events.paceGroups,
      maxParticipants: events.maxParticipants,
      coverImageUrl: events.coverImageUrl,
      status: events.status,
    })
    .from(events)
    .where(
      status === "upcoming"
        ? and(eq(events.status, "upcoming"), gte(events.date, now))
        : eq(events.status, status)
    )
    .orderBy(status === "upcoming" ? asc(events.date) : desc(events.date))
    .limit(limit);

  // Get RSVP counts and user's RSVP status in a single query
  const eventIds = results.map((e) => e.id);
  let rsvpCounts: Record<string, number> = {};
  let goingSet = new Set<string>();

  if (eventIds.length > 0) {
    // Count RSVPs per event
    const counts = await db
      .select({
        eventId: eventRsvps.eventId,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(eventRsvps)
      .where(
        and(
          eq(eventRsvps.status, "going"),
          sql`${eventRsvps.eventId} IN (${sql.join(eventIds.map(id => sql`${id}`), sql`, `)})`
        )
      )
      .groupBy(eventRsvps.eventId);

    for (const c of counts) {
      rsvpCounts[c.eventId] = c.count;
    }

    // Check user's RSVPs
    if (user) {
      const myRsvps = await db
        .select({ eventId: eventRsvps.eventId, status: eventRsvps.status })
        .from(eventRsvps)
        .where(
          and(
            eq(eventRsvps.memberId, user.id),
            sql`${eventRsvps.eventId} IN (${sql.join(eventIds.map(id => sql`${id}`), sql`, `)})`
          )
        );
      goingSet = new Set(
        myRsvps.filter((r) => r.status === "going").map((r) => r.eventId)
      );
    }
  }

  const annotated = results.map((e) => ({
    ...e,
    rsvpCount: rsvpCounts[e.id] || 0,
    isGoing: goingSet.has(e.id),
  }));

  return NextResponse.json({ events: annotated });
}

// POST /api/events — create event (any authenticated user)
export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const rateLimited = await checkRateLimit(`event:${user.id}`, { maxRequests: 10, windowSec: 60 });
  if (rateLimited) return rateLimited;
  const session = { user: { id: user.id } };  // compatibility shim

  const body = await request.json();

  // Zod validation
  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const {
    title,
    description,
    eventType = "group_run",
    date,
    meetingPoint,
    meetingLat,
    meetingLng,
    distanceM,
    paceGroups,
    maxParticipants,
    coverImageUrl,
    routeId,
  } = parsed.data;

  // Validate date: must be valid and in the future (within 1 year)
  const eventDate = new Date(date);
  if (isNaN(eventDate.getTime())) {
    return NextResponse.json({ error: "Ge\u00E7ersiz tarih format\u0131" }, { status: 400 });
  }
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  if (eventDate.getTime() < Date.now() - 3600000) {
    // Allow up to 1 hour in past for timezone differences
    return NextResponse.json({ error: "Etkinlik tarihi ge\u00E7mi\u015F olamaz" }, { status: 400 });
  }
  if (eventDate.getTime() > oneYearFromNow.getTime()) {
    return NextResponse.json({ error: "Etkinlik en fazla 1 y\u0131l sonras\u0131na olu\u015Fturulabilir" }, { status: 400 });
  }

  if (distanceM !== undefined && distanceM !== null) {
    if (distanceM <= 0 || distanceM > 200000) {
      return NextResponse.json({ error: "Distance must be between 0 and 200km" }, { status: 400 });
    }
  }

  if (maxParticipants !== undefined && maxParticipants !== null) {
    if (maxParticipants <= 0 || maxParticipants > 1000) {
      return NextResponse.json({ error: "Max participants must be between 1 and 1000" }, { status: 400 });
    }
  }

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

  const [event] = await db
    .insert(events)
    .values({
      title,
      slug: `${slug}-${Date.now().toString(36)}`,
      description,
      eventType,
      date: new Date(date),
      meetingPoint,
      meetingLat,
      meetingLng,
      distanceM,
      paceGroups,
      maxParticipants,
      coverImageUrl,
      routeId,
      createdBy: session.user.id,
    })
    .returning();

  // Notify followers of the event creator (fire and forget)
  (async () => {
    try {
      const [creator] = await db
        .select({ name: members.name })
        .from(members)
        .where(eq(members.id, session.user.id))
        .limit(1);

      const followerTokens = await db
        .select({ pushToken: members.pushToken })
        .from(follows)
        .innerJoin(members, eq(follows.followerId, members.id))
        .where(eq(follows.followingId, session.user.id));

      const tokens = followerTokens
        .map(f => f.pushToken)
        .filter((t): t is string => !!t);

      if (tokens.length > 0 && creator) {
        sendPushNotifications(
          tokens,
          "Yeni Etkinlik",
          `\u{1F3C3} ${creator.name} yeni bir etkinlik olu\u015Fturdu: ${title}`,
          { type: "event", eventId: event.id }
        );
      }
    } catch (e) {
      console.error("Event push notification error:", e);
    }
  })();

  return NextResponse.json(event, { status: 201 });
}
