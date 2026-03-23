import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import { events, eventRsvps, members } from "@/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { sendPushNotification } from "@/lib/push";

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

  let paceGroup: string | undefined;
  try {
    const body = await request.json();
    paceGroup = body.paceGroup;
  } catch {
    // Body is optional — RSVP without pace group is fine
  }

  // RSVP logic (neon-http doesn't support transactions, using sequential queries)
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

  // Check existing RSVP
  const [existing] = await db
    .select({ id: eventRsvps.id, status: eventRsvps.status })
    .from(eventRsvps)
    .where(and(eq(eventRsvps.eventId, event.id), eq(eventRsvps.memberId, session.user.id)))
    .limit(1);

  let result: { data: { status: string; action: string }; status: number };

  if (existing) {
    const newStatus = existing.status === "going" ? "cancelled" : "going";

    if (newStatus === "going" && event.maxParticipants) {
      const [{ value: currentCount }] = await db
        .select({ value: count() })
        .from(eventRsvps)
        .where(and(eq(eventRsvps.eventId, event.id), eq(eventRsvps.status, "going")));
      if (Number(currentCount) >= event.maxParticipants) {
        return NextResponse.json({ error: "Etkinlik kapasitesi dolu" }, { status: 400 });
      }
    }

    await db.update(eventRsvps).set({ status: newStatus, paceGroup }).where(eq(eventRsvps.id, existing.id));
    result = { data: { status: newStatus, action: newStatus === "going" ? "joined" : "left" }, status: 200 };
  } else {
    if (event.maxParticipants) {
      const [{ value: currentCount }] = await db
        .select({ value: count() })
        .from(eventRsvps)
        .where(and(eq(eventRsvps.eventId, event.id), eq(eventRsvps.status, "going")));
      if (Number(currentCount) >= event.maxParticipants) {
        return NextResponse.json({ error: "Etkinlik kapasitesi dolu" }, { status: 400 });
      }
    }

    await db.insert(eventRsvps).values({
      eventId: event.id,
      memberId: session.user.id,
      paceGroup,
      status: "going",
    });
    result = { data: { status: "going", action: "joined" }, status: 201 };
  }

  // Send push notification to event creator when someone joins
  if (result.data.action === "joined") {
    (async () => {
      try {
        // Get event details including creator
        const [eventRow] = await db
          .select({ title: events.title, createdBy: events.createdBy })
          .from(events)
          .where(eq(events.slug, slug))
          .limit(1);

        if (!eventRow?.createdBy || eventRow.createdBy === session.user.id) return;

        // Get creator's push token
        const [creator] = await db
          .select({ pushToken: members.pushToken })
          .from(members)
          .where(eq(members.id, eventRow.createdBy))
          .limit(1);

        // Get the name of the member who RSVPed
        const [rsvper] = await db
          .select({ name: members.name })
          .from(members)
          .where(eq(members.id, session.user.id))
          .limit(1);

        if (creator?.pushToken && rsvper) {
          sendPushNotification(
            creator.pushToken,
            "Yeni Katilimci!",
            `\u{1F389} ${rsvper.name} etkinligine katildi: ${eventRow.title}`,
            { type: "event_rsvp", eventSlug: slug }
          );
        }
      } catch (e) {
        console.error("RSVP push notification error:", e);
      }
    })();
  }

  return NextResponse.json(result.data, { status: result.status });
}
