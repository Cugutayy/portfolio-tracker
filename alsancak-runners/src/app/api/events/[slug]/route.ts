import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events, eventRsvps, members } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const [event] = await db
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
      rsvpCount: sql<number>`(SELECT COUNT(*) FROM event_rsvps WHERE event_id = ${events.id} AND status = 'going')::int`,
    })
    .from(events)
    .where(eq(events.slug, slug))
    .limit(1);

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get RSVP'd members (public names only)
  const rsvps = await db
    .select({
      id: eventRsvps.id,
      memberName: members.name,
      memberImage: members.image,
      paceGroup: eventRsvps.paceGroup,
      status: eventRsvps.status,
    })
    .from(eventRsvps)
    .innerJoin(members, eq(eventRsvps.memberId, members.id))
    .where(eq(eventRsvps.eventId, event.id));

  return NextResponse.json({ event, rsvps });
}
