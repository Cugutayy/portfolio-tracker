import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/mobile-auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { db } from "@/lib/db";
import { events, eventRsvps, members } from "@/db/schema";
import { eq, gte, asc, desc, sql, and } from "drizzle-orm";

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

// POST /api/events — create event (admin/captain only)
export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const rateLimited = await checkRateLimit(`event:${user.id}`, { maxRequests: 10, windowSec: 60 });
  if (rateLimited) return rateLimited;
  const session = { user: { id: user.id } };  // compatibility shim

  // All authenticated users can create events

  const body = await request.json();
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
  } = body;

  if (!title || !date) {
    return NextResponse.json(
      { error: "Title and date are required" },
      { status: 400 }
    );
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

  return NextResponse.json(event, { status: 201 });
}
