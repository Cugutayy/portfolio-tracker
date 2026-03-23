import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser } from "@/lib/mobile-auth";
import { checkRateLimit } from "@/lib/rateLimit";
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

// --- POST /api/routes — Create route ---

const createRouteSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(2000).optional().nullable(),
  distanceM: z.number().min(100, "Minimum 100m").max(100000, "Maximum 100km"),
  elevationGainM: z.number().min(0).max(10000).optional().nullable(),
  difficulty: z.enum(["easy", "moderate", "hard"]).optional().default("moderate"),
  surfaceType: z.string().max(50).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  isLoop: z.boolean().optional().default(false),
  polylineGeojson: z.any().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rateLimited = await checkRateLimit(`route:${user.id}`, {
    maxRequests: 5,
    windowSec: 3600,
  });
  if (rateLimited) return rateLimited;

  const body = await request.json();

  const parsed = createRouteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const {
    name,
    description,
    distanceM,
    elevationGainM,
    difficulty,
    surfaceType,
    city,
    isLoop,
    polylineGeojson,
  } = parsed.data;

  // Generate slug (Turkish char support)
  const baseSlug = name
    .toLowerCase()
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i")
    .replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  const [route] = await db
    .insert(routes)
    .values({
      name,
      slug,
      description,
      distanceM,
      elevationGainM,
      difficulty,
      surfaceType: surfaceType || "road",
      city: city || "Izmir",
      isLoop: isLoop ?? false,
      polylineGeojson,
      createdBy: user.id,
    })
    .returning();

  return NextResponse.json(route, { status: 201 });
}
