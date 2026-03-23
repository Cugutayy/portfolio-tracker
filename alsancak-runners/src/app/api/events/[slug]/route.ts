import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import { events, eventRsvps, members } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Try to get current user (optional)
  const user = await getRequestUser(request).catch(() => null);

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
    })
    .from(events)
    .where(eq(events.slug, slug))
    .limit(1);

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get RSVP'd members with memberId
  const rsvps = await db
    .select({
      id: eventRsvps.id,
      memberId: eventRsvps.memberId,
      memberName: members.name,
      memberImage: members.image,
      paceGroup: eventRsvps.paceGroup,
      status: eventRsvps.status,
    })
    .from(eventRsvps)
    .innerJoin(members, eq(eventRsvps.memberId, members.id))
    .where(eq(eventRsvps.eventId, event.id));

  const rsvpCount = rsvps.filter((r) => r.status === "going").length;
  const isGoing = user
    ? rsvps.some((r) => r.memberId === user.id && r.status === "going")
    : false;

  return NextResponse.json({ event: { ...event, rsvpCount, isGoing }, rsvps });
}
