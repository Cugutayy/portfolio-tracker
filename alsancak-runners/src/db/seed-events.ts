/**
 * Seed script: Populates sample upcoming events for the community.
 *
 * Run with: npx tsx src/db/seed-events.ts
 */
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { events, routes } from "./schema";
import { eq, sql } from "drizzle-orm";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const db = drizzle(neon(process.env.DATABASE_URL!));

async function seed() {
  console.log("🌱 Seeding events...");

  // Get route IDs for linking
  const routeList = await db.select({ id: routes.id, slug: routes.slug }).from(routes);
  const routeMap = Object.fromEntries(routeList.map((r) => [r.slug, r.id]));

  // Check existing events
  const [{ count }] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(events);
  if (count > 0) {
    console.log(`  ⏭ ${count} events already exist, skipping`);
    return;
  }

  // Create upcoming events (dates in the future)
  const now = new Date();
  const nextSaturday = new Date(now);
  nextSaturday.setDate(now.getDate() + (6 - now.getDay()));

  const EVENT_DATA = [
    {
      title: "Kordon Sunrise Run",
      slug: "kordon-sunrise-run",
      description:
        "Güneşin doğuşuyla birlikte Kordon boyunca koşuyoruz. Kahvaltı dahil!",
      eventType: "group_run",
      routeId: routeMap["kordon-turu"],
      date: new Date(nextSaturday.getFullYear(), nextSaturday.getMonth(), nextSaturday.getDate(), 6, 30),
      meetingPoint: "Cumhuriyet Meydanı, Alsancak",
      meetingLat: 38.4355,
      meetingLng: 27.1418,
      distanceM: 7000,
      paceGroups: [
        { name: "Rahat", pace: "6:30-7:00", color: "#4ade80" },
        { name: "Orta", pace: "5:30-6:00", color: "#E6FF00" },
        { name: "Hızlı", pace: "4:30-5:30", color: "#FC4C02" },
      ],
      maxParticipants: 50,
      status: "upcoming",
    },
    {
      title: "Kültürpark Tempo Koşusu",
      slug: "kulturpark-tempo",
      description:
        "Hız çalışması! Kültürpark'ta tempo koşusu. Tüm seviyeler hoş geldiniz.",
      eventType: "tempo_run",
      routeId: routeMap["kulturpark"],
      date: new Date(nextSaturday.getFullYear(), nextSaturday.getMonth(), nextSaturday.getDate() + 3, 18, 0),
      meetingPoint: "Kültürpark Ana Giriş",
      meetingLat: 38.4285,
      meetingLng: 27.1455,
      distanceM: 5000,
      paceGroups: [
        { name: "Isınma", pace: "7:00+", color: "#4ade80" },
        { name: "Tempo", pace: "5:00-6:00", color: "#E6FF00" },
      ],
      maxParticipants: 30,
      status: "upcoming",
    },
    {
      title: "Körfez Uzun Koşu",
      slug: "korfez-uzun-kosu",
      description:
        "Ayın uzun koşusu. İzmir Körfezi'nin tam turunu birlikte koşuyoruz. Su istasyonları ve destek aracı mevcut.",
      eventType: "long_run",
      routeId: routeMap["korfezi-turu"],
      date: new Date(nextSaturday.getFullYear(), nextSaturday.getMonth(), nextSaturday.getDate() + 7, 7, 0),
      meetingPoint: "Göztepe Sahil, İzmir",
      meetingLat: 38.4035,
      meetingLng: 27.084,
      distanceM: 18000,
      paceGroups: [
        { name: "Rahat", pace: "6:30-7:30", color: "#4ade80" },
        { name: "Orta", pace: "5:30-6:30", color: "#E6FF00" },
        { name: "Hızlı", pace: "4:30-5:30", color: "#FC4C02" },
      ],
      maxParticipants: 40,
      status: "upcoming",
    },
    {
      title: "Yeni Başlayanlar Koşusu",
      slug: "yeni-baslayanlar",
      description:
        "Koşuya yeni başlayanlar için özel etkinlik. Koç eşliğinde güvenli ve eğlenceli bir 3 km.",
      eventType: "group_run",
      routeId: routeMap["kordon-turu"],
      date: new Date(nextSaturday.getFullYear(), nextSaturday.getMonth(), nextSaturday.getDate() + 10, 9, 0),
      meetingPoint: "Alsancak Vapur İskelesi",
      meetingLat: 38.4338,
      meetingLng: 27.1412,
      distanceM: 3000,
      paceGroups: [
        { name: "Herkes", pace: "7:00+", color: "#4ade80" },
      ],
      maxParticipants: 25,
      status: "upcoming",
    },
  ];

  for (const ev of EVENT_DATA) {
    const [inserted] = await db.insert(events).values(ev).returning({ id: events.id });
    console.log(`  ✅ ${ev.title} (${inserted.id})`);
  }

  console.log("\n🎉 Event seeding complete!");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  });
