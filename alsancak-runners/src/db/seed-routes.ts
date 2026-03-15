/**
 * Seed script: Populates the 3 editorial routes (Kordon Turu, Körfezi Turu, Kültürpark)
 * with real GPS coordinates for Izmir.
 *
 * Run with: npx tsx src/db/seed-routes.ts
 */
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { routes, routeSegments } from "./schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// Real GPS coordinates for Izmir routes
const ROUTE_DATA = [
  {
    name: "KORDON TURU",
    slug: "kordon-turu",
    description:
      "Alsancak Kordon boyunca uzanan klasik sahil koşusu. Cumhuriyet Meydanı'ndan başlayıp Konak Meydanı'na kadar İzmir Körfezi manzarasıyla düz ve hızlı bir parkur.",
    distanceM: 7000,
    elevationGainM: 15,
    surfaceType: "road",
    difficulty: "easy",
    isLoop: false,
    city: "Izmir",
    // Cumhuriyet Meydanı to Konak
    startLat: 38.4355,
    startLng: 27.1418,
    endLat: 38.4185,
    endLng: 27.1285,
    geojson: {
      type: "LineString" as const,
      coordinates: [
        [27.1418, 38.4355], // Cumhuriyet Meydanı
        [27.1415, 38.4340],
        [27.1408, 38.4325],
        [27.1398, 38.4310],
        [27.1388, 38.4295], // Kordon ortası
        [27.1378, 38.4280],
        [27.1365, 38.4265],
        [27.1350, 38.4250],
        [27.1338, 38.4238], // Pasaport
        [27.1325, 38.4225],
        [27.1315, 38.4215],
        [27.1305, 38.4205],
        [27.1295, 38.4195], // Konak'a yaklaşma
        [27.1285, 38.4185], // Konak Meydanı
      ],
    },
    segments: [
      {
        segmentIndex: 0,
        name: "Cumhuriyet - Pasaport",
        distanceM: 3500,
        elevationM: 5,
        surfaceType: "road",
      },
      {
        segmentIndex: 1,
        name: "Pasaport - Konak",
        distanceM: 3500,
        elevationM: 10,
        surfaceType: "road",
      },
    ],
  },
  {
    name: "KÖRFEZİ TURU",
    slug: "korfezi-turu",
    description:
      "İzmir Körfezi'nin tam turu. Göztepe'den başlayıp Konak, Alsancak, Bayraklı, Bostanlı ve Karşıyaka'yı kapsayan 18 km'lik epik rota. Tepelik bölgelerde zorlayıcı tırmanışlar içerir.",
    distanceM: 18000,
    elevationGainM: 120,
    surfaceType: "mixed",
    difficulty: "hard",
    isLoop: true,
    city: "Izmir",
    // Full bay circuit
    startLat: 38.4035,
    startLng: 27.0840,
    endLat: 38.4035,
    endLng: 27.0840,
    geojson: {
      type: "LineString" as const,
      coordinates: [
        [27.0840, 38.4035], // Göztepe
        [27.0920, 38.4060],
        [27.1000, 38.4090],
        [27.1080, 38.4120],
        [27.1160, 38.4150],
        [27.1240, 38.4175],
        [27.1285, 38.4185], // Konak
        [27.1325, 38.4225],
        [27.1365, 38.4265],
        [27.1405, 38.4310],
        [27.1418, 38.4355], // Alsancak
        [27.1435, 38.4400],
        [27.1450, 38.4430],
        [27.1465, 38.4460], // Bayraklı
        [27.1480, 38.4490],
        [27.1470, 38.4520],
        [27.1445, 38.4540],
        [27.1410, 38.4555], // Bostanlı
        [27.1360, 38.4560],
        [27.1300, 38.4555],
        [27.1240, 38.4545],
        [27.1180, 38.4530], // Karşıyaka
        [27.1120, 38.4510],
        [27.1060, 38.4480],
        [27.1000, 38.4440],
        [27.0960, 38.4400],
        [27.0930, 38.4350],
        [27.0910, 38.4300],
        [27.0890, 38.4250],
        [27.0870, 38.4200],
        [27.0855, 38.4150],
        [27.0845, 38.4100],
        [27.0840, 38.4035], // Göztepe (loop end)
      ],
    },
    segments: [
      {
        segmentIndex: 0,
        name: "Göztepe - Konak",
        distanceM: 5000,
        elevationM: 20,
        surfaceType: "road",
      },
      {
        segmentIndex: 1,
        name: "Konak - Alsancak",
        distanceM: 4000,
        elevationM: 10,
        surfaceType: "road",
      },
      {
        segmentIndex: 2,
        name: "Alsancak - Bayraklı",
        distanceM: 3000,
        elevationM: 45,
        surfaceType: "mixed",
      },
      {
        segmentIndex: 3,
        name: "Bayraklı - Karşıyaka",
        distanceM: 3000,
        elevationM: 30,
        surfaceType: "road",
      },
      {
        segmentIndex: 4,
        name: "Karşıyaka - Göztepe",
        distanceM: 3000,
        elevationM: 15,
        surfaceType: "road",
      },
    ],
  },
  {
    name: "KÜLTÜRPARK",
    slug: "kulturpark",
    description:
      "Kültürpark içinde düz ve hızlı park turu. Ağaçlık alanlar arasında gölgeli parkurda 5 km'lik rahat bir koşu. Başlangıç seviyesi için ideal.",
    distanceM: 5000,
    elevationGainM: 8,
    surfaceType: "trail",
    difficulty: "easy",
    isLoop: true,
    city: "Izmir",
    // Kültürpark loop
    startLat: 38.4285,
    startLng: 27.1455,
    endLat: 38.4285,
    endLng: 27.1455,
    geojson: {
      type: "LineString" as const,
      coordinates: [
        [27.1455, 38.4285], // Start/End (NW corner)
        [27.1470, 38.4285],
        [27.1490, 38.4282],
        [27.1510, 38.4278], // NE area
        [27.1520, 38.4270],
        [27.1525, 38.4258],
        [27.1520, 38.4245],
        [27.1510, 38.4235], // SE area
        [27.1495, 38.4230],
        [27.1475, 38.4228],
        [27.1460, 38.4230], // S center
        [27.1445, 38.4235],
        [27.1435, 38.4245],
        [27.1430, 38.4258], // SW area
        [27.1435, 38.4270],
        [27.1445, 38.4280],
        [27.1455, 38.4285], // Back to start
      ],
    },
    segments: [
      {
        segmentIndex: 0,
        name: "Kuzey Parkur",
        distanceM: 2500,
        elevationM: 4,
        surfaceType: "trail",
      },
      {
        segmentIndex: 1,
        name: "Güney Parkur",
        distanceM: 2500,
        elevationM: 4,
        surfaceType: "trail",
      },
    ],
  },
];

async function seed() {
  console.log("🌱 Seeding routes...");

  for (const route of ROUTE_DATA) {
    // Check if route already exists
    const existing = await db
      .select({ id: routes.id })
      .from(routes)
      .where(eq(routes.slug, route.slug))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  ⏭ ${route.name} already exists, skipping`);
      continue;
    }

    // Insert route
    const [inserted] = await db
      .insert(routes)
      .values({
        name: route.name,
        slug: route.slug,
        description: route.description,
        distanceM: route.distanceM,
        elevationGainM: route.elevationGainM,
        startLat: route.startLat,
        startLng: route.startLng,
        endLat: route.endLat,
        endLng: route.endLng,
        surfaceType: route.surfaceType,
        difficulty: route.difficulty,
        isLoop: route.isLoop,
        city: route.city,
        polylineGeojson: route.geojson,
      })
      .returning({ id: routes.id });

    console.log(`  ✅ ${route.name} (${inserted.id})`);

    // Insert segments
    for (const seg of route.segments) {
      await db.insert(routeSegments).values({
        routeId: inserted.id,
        segmentIndex: seg.segmentIndex,
        name: seg.name,
        distanceM: seg.distanceM,
        elevationM: seg.elevationM,
        surfaceType: seg.surfaceType,
      });
    }
    console.log(`    📍 ${route.segments.length} segments added`);
  }

  console.log("\n🎉 Route seeding complete!");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  });
