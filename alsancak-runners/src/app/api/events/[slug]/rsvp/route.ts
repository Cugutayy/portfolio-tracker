import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import { events, eventRsvps } from "@/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

// POST /api/events/[slug]/rsvp — RSVP to an event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const session = { user: { id: user.id } };  // compatibility shim

  // Rate limit: 10 RSVPs per minute per user
  const rateLimited = await checkRateLimit(
    `rsvp:${session.user.id}`,
    RATE_LIMITS.eventRsvp
  );
  if (rateLimited) return rateLimited;

  const { slug } = await params;

  // Get event
  const [event] = await db
    .select({ id: events.id, maxParticipants: events.maxParticipants, status: events.status })
    .from(events)
    .where(eq(events.slug, slug))
    .limit(1);

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (event.status !== "upcoming") {
    return NextResponse.json({ error: "Event is not accepting RSVPs" }, { status: 400 });
  }

  let paceGroup: string | undefined;
  try {
    const body = await request.json();
    paceGroup = body.paceGroup;
  } catch {
    // Body is optional — RSVP without pace group is fine
  }

  // Check existing RSVP
  const [existing] = await db
    .select({ id: eventRsvps.id, status: eventRsvps.status })
    .from(eventRsvps)
    .where(
      and(
        eq(eventRsvps.eventId, event.id),
        eq(eventRsvps.memberId, session.user.id)
      )
    )
    .limit(1);

  if (existing) {
    // Toggle: if already going → cancel, if cancelled → re-going
    const newStatus = existing.status === "going" ? "cancelled" : "going";

    // Check capacity when re-joining
    if (newStatus === "going" && event.maxParticipants) {
      const [{ value: currentCount }] = await db
        .select({ value: count() })
        .from(eventRsvps)
        .where(and(eq(eventRsvps.eventId, event.id), eq(eventRsvps.status, "going")));
      if (Number(currentCount) >= event.maxParticipants) {
        return NextResponse.json({ error: "Etkinlik kapasitesi dolu" }, { status: 400 });
      }
    }

    await db
      .update(eventRsvps)
      .set({ status: newStatus, paceGroup })
      .where(eq(eventRsvps.id, existing.id));

    return NextResponse.json({ status: newStatus, action: newStatus === "going" ? "joined" : "left" });
  }

  // Check capacity for new RSVP
  if (event.maxParticipants) {
    const [{ value: currentCount }] = await db
      .select({ value: count() })
      .from(eventRsvps)
      .where(and(eq(eventRsvps.eventId, event.id), eq(eventRsvps.status, "going")));
    if (Number(currentCount) >= event.maxParticipants) {
      return NextResponse.json({ error: "Etkinlik kapasitesi dolu" }, { status: 400 });
    }
  }

  // New RSVP
  const [rsvp] = await db
    .insert(eventRsvps)
    .values({
      eventId: event.id,
      memberId: session.user.id,
      paceGroup,
      status: "going",
    })
    .returning();

  return NextResponse.json({ status: "going", action: "joined", rsvp }, { status: 201 });
}
