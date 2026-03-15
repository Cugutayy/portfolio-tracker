import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { routes } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const allRoutes = await db
    .select({
      id: routes.id,
      name: routes.name,
      slug: routes.slug,
      description: routes.description,
      distanceM: routes.distanceM,
      elevationGainM: routes.elevationGainM,
      startLat: routes.startLat,
      startLng: routes.startLng,
      endLat: routes.endLat,
      endLng: routes.endLng,
      surfaceType: routes.surfaceType,
      difficulty: routes.difficulty,
      isLoop: routes.isLoop,
      city: routes.city,
    })
    .from(routes)
    .orderBy(asc(routes.distanceM));

  return NextResponse.json({ routes: allRoutes });
}
