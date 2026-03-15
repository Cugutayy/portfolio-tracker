import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { routes, routeSegments } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const [route] = await db
    .select()
    .from(routes)
    .where(eq(routes.slug, slug))
    .limit(1);

  if (!route) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const segments = await db
    .select()
    .from(routeSegments)
    .where(eq(routeSegments.routeId, route.id))
    .orderBy(asc(routeSegments.segmentIndex));

  return NextResponse.json({ route, segments });
}
