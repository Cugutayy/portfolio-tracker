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

  // Wrap RSVP logic in a transaction with FOR UPDATE row locking
  const result = await db.transaction(async (tx) => {
    // Lock the event row to prevent overbooking
    const eventRows = await tx.execute(
      sql`SELECT id, max_participants, status FROM events WHERE slug = ${slug} LIMIT 1 FOR UPDATE`
    );

    const event = eventRows.rows?.[0] as { id: string; max_participants: number | null; status: string } | undefined;

    if (!event) {
      return { error: "Event not found", status: 404 };
    }

    if (event.status !== "upcoming") {
      return { error: "Event is not accepting RSVPs", status: 400 };
    }

    // Check existing RSVP
    const [existing] = await tx
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
      if (newStatus === "going" && event.max_participants) {
        const [{ value: currentCount }] = await tx
          .select({ value: count() })
          .from(eventRsvps)
          .where(and(eq(eventRsvps.eventId, event.id), eq(eventRsvps.status, "going")));
        if (Number(currentCount) >= event.max_participants) {
          return { error: "Etkinlik kapasitesi dolu", status: 400 };
        }
      }

      await tx
        .update(eventRsvps)
        .set({ status: newStatus, paceGroup })
        .where(eq(eventRsvps.id, existing.id));

      return { data: { status: newStatus, action: newStatus === "going" ? "joined" : "left" }, status: 200 };
    }

    // Check capacity for new RSVP
    if (event.max_participants) {
      const [{ value: currentCount }] = await tx
        .select({ value: count() })
        .from(eventRsvps)
        .where(and(eq(eventRsvps.eventId, event.id), eq(eventRsvps.status, "going")));
      if (Number(currentCount) >= event.max_participants) {
        return { error: "Etkinlik kapasitesi dolu", status: 400 };
      }
    }

    // New RSVP
    const [rsvp] = await tx
      .insert(eventRsvps)
      .values({
        eventId: event.id,
        memberId: session.user.id,
        paceGroup,
        status: "going",
      })
      .returning();

    return { data: { status: "going", action: "joined", rsvp }, status: 201 };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
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
