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

  let paceGroup: string | undefined;
  try {
    const body = await request.json();
    paceGroup = body.paceGroup;
  } catch {
    // Body is optional — RSVP without pace group is fine
  }

  const result = await db.transaction(async (tx) => {
    // Lock event row to serialize capacity-sensitive RSVP writes
    const lockedEvents = await tx.execute(sql`
      SELECT id, max_participants, status
      FROM events
      WHERE slug = ${slug}
      FOR UPDATE
    `);

    const event = lockedEvents.rows[0] as
      | { id: string; max_participants: number | null; status: string }
      | undefined;

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (event.status !== "upcoming") {
      return NextResponse.json({ error: "Event is not accepting RSVPs" }, { status: 400 });
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
      const newStatus = existing.status === "going" ? "cancelled" : "going";

      if (newStatus === "going" && event.max_participants) {
        const [{ value: currentCount }] = await tx
          .select({ value: count() })
          .from(eventRsvps)
          .where(and(eq(eventRsvps.eventId, event.id), eq(eventRsvps.status, "going")));
        if (Number(currentCount) >= event.max_participants) {
          return NextResponse.json({ error: "Etkinlik kapasitesi dolu" }, { status: 400 });
        }
      }

      await tx
        .update(eventRsvps)
        .set({ status: newStatus, paceGroup })
        .where(eq(eventRsvps.id, existing.id));

      return NextResponse.json({ status: newStatus, action: newStatus === "going" ? "joined" : "left" });
    }

    if (event.max_participants) {
      const [{ value: currentCount }] = await tx
        .select({ value: count() })
        .from(eventRsvps)
        .where(and(eq(eventRsvps.eventId, event.id), eq(eventRsvps.status, "going")));
      if (Number(currentCount) >= event.max_participants) {
        return NextResponse.json({ error: "Etkinlik kapasitesi dolu" }, { status: 400 });
      }
    }

    const [rsvp] = await tx
      .insert(eventRsvps)
      .values({
        eventId: event.id,
        memberId: session.user.id,
        paceGroup,
        status: "going",
      })
      .returning();

    return NextResponse.json({ status: "going", action: "joined", rsvp }, { status: 201 });
  });

  return result;
}
