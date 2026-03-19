/**
 * Seed script for Alsancak Runners.
 * Creates demo members, events, and activities with real Izmir polylines.
 *
 * Usage: npx tsx src/db/seed.ts
 * Requires: DATABASE_URL in .env.local
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { randomUUID } from "crypto";
import * as schema from "./schema/index";

config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set in .env.local");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

// ── Izmir polylines (real routes) ──

// Kordon — Alsancak sahil yolu (~3.5km)
const KORDON_POLYLINE = "_{kzEotthGgA}CwAiDcBiEgAqDYwCUyBSwBOqBKuAEaA?w@Bq@Hg@Nc@R]V[ZU\\O^I`@E^?^B\\F\\L\\RVVPZLb@Hb@Db@@b@Ab@Cb@Gb@Kb@QZUZ]T_@Ra@Pc@Nc@Le@Jg@Hi@Fk@Dm@@m@Am@Ck@Ei@Gg@Ie@Mc@Oa@Q_@SY";

// Kulturpark — park icinde tur (~2km)
const KULTURPARK_POLYLINE = "wdkzEqvthGsA}AcBqBaBsBgAqBw@yBi@{Be@}Be@}BcAqEYsBMqAIqAEsA?sADsAHqANqARoATmA\\kAb@iAh@gAn@eAt@cAx@aA|@_A~@}@bAy@dAw@fAu@hAs@jAq@lAo@nAm@pAk@";

// Goztepe — sahil yolu (~5km)
const GOZTEPE_POLYLINE = "u_jzE}fshGaA{CcAaDcAcDeAcDeAaDeAaDgA_DgA}CiA{CiAyCkAyCkAwCmAuCmAsCo@}AoAqCqAmCsAkCsAiCuAgCuAeCwAcCwAaCyA_Cy@oAyAmC{AkC{AiC}AgC}AeC_BcC_BaC";

async function seed() {
  console.log("Seeding database...\n");

  // ── 1. Demo Members ──
  const memberIds = {
    ali: randomUUID(),
    zeynep: randomUUID(),
    mehmet: randomUUID(),
    elif: randomUUID(),
    can: randomUUID(),
  };

  const members = [
    { id: memberIds.ali, email: "ali@demo.local", name: "Ali Yilmaz", paceGroup: "intermediate", privacy: "public", role: "admin", onboardingDone: true },
    { id: memberIds.zeynep, email: "zeynep@demo.local", name: "Zeynep Kaya", paceGroup: "advanced", privacy: "public", role: "member", onboardingDone: true },
    { id: memberIds.mehmet, email: "mehmet@demo.local", name: "Mehmet Demir", paceGroup: "beginner", privacy: "public", role: "member", onboardingDone: true },
    { id: memberIds.elif, email: "elif@demo.local", name: "Elif Celik", paceGroup: "intermediate", privacy: "public", role: "captain", onboardingDone: true },
    { id: memberIds.can, email: "can@demo.local", name: "Can Ozturk", paceGroup: "advanced", privacy: "public", role: "member", onboardingDone: true },
  ];

  for (const m of members) {
    await db.insert(schema.members).values(m).onConflictDoNothing();
  }
  console.log(`✓ ${members.length} demo members created`);

  // ── 2. Events ──
  const now = new Date();
  const eventData = [
    {
      title: "Kordon Sunrise Run",
      slug: `kordon-sunrise-run-${Date.now().toString(36)}`,
      description: "Gundogumunda Kordon boyunca kosu. Herkes dahil, her seviye hos gelir!",
      eventType: "group_run",
      date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // +2 gun
      meetingPoint: "Cumhuriyet Meydani, Alsancak",
      meetingLat: 38.4350,
      meetingLng: 27.1400,
      distanceM: 7000,
      maxParticipants: 50,
      status: "upcoming",
      createdBy: memberIds.ali,
    },
    {
      title: "Kulturpark Tempo Kosusu",
      slug: `kulturpark-tempo-${Date.now().toString(36)}`,
      description: "Kulturpark icinde tempo calismasi. Orta-ileri seviye.",
      eventType: "tempo_run",
      date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // +5 gun
      meetingPoint: "Kulturpark Ana Giris",
      meetingLat: 38.4280,
      meetingLng: 27.1460,
      distanceM: 5000,
      maxParticipants: 30,
      status: "upcoming",
      createdBy: memberIds.elif,
    },
    {
      title: "Korfez Uzun Kosu",
      slug: `korfez-uzun-kosu-${Date.now().toString(36)}`,
      description: "Izmir Korfezi boyunca uzun mesafe kosusu. Deneyimli kosucular icin.",
      eventType: "long_run",
      date: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000), // +9 gun
      meetingPoint: "Goztepe Sahil, Izmir",
      meetingLat: 38.3950,
      meetingLng: 27.0780,
      distanceM: 18000,
      maxParticipants: 20,
      status: "upcoming",
      createdBy: memberIds.can,
    },
    {
      title: "Yeni Baslayanlar Kosusu",
      slug: `yeni-baslayanlar-${Date.now().toString(36)}`,
      description: "Kosuya yeni baslayanlara ozel yavas tempolu grup kosusu.",
      eventType: "group_run",
      date: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000), // +12 gun
      meetingPoint: "Alsancak Vapur Iskelesi",
      meetingLat: 38.4380,
      meetingLng: 27.1350,
      distanceM: 3000,
      maxParticipants: 40,
      status: "upcoming",
      createdBy: memberIds.ali,
    },
  ];

  for (const e of eventData) {
    await db.insert(schema.events).values(e).onConflictDoNothing();
  }
  console.log(`✓ ${eventData.length} events created`);

  // ── 3. Activities ──
  const activityData = [
    // Ali — 3 runs
    { memberId: memberIds.ali, title: "Sabah Kordon Kosusu", distanceM: 7200, movingTimeSec: 2520, polyline: KORDON_POLYLINE, startLat: 38.435, startLng: 27.140, daysAgo: 1 },
    { memberId: memberIds.ali, title: "Kulturpark Turlari", distanceM: 4100, movingTimeSec: 1440, polyline: KULTURPARK_POLYLINE, startLat: 38.428, startLng: 27.146, daysAgo: 4 },
    { memberId: memberIds.ali, title: "Aksam Kosusu", distanceM: 5500, movingTimeSec: 1980, polyline: KORDON_POLYLINE, startLat: 38.435, startLng: 27.140, daysAgo: 7 },

    // Zeynep — 4 runs (advanced)
    { memberId: memberIds.zeynep, title: "Goztepe Uzun Kosu", distanceM: 15200, movingTimeSec: 4560, polyline: GOZTEPE_POLYLINE, startLat: 38.395, startLng: 27.078, daysAgo: 0 },
    { memberId: memberIds.zeynep, title: "Kordon Tempo", distanceM: 8400, movingTimeSec: 2520, polyline: KORDON_POLYLINE, startLat: 38.435, startLng: 27.140, daysAgo: 3 },
    { memberId: memberIds.zeynep, title: "Recovery Jog", distanceM: 3200, movingTimeSec: 1440, polyline: KULTURPARK_POLYLINE, startLat: 38.428, startLng: 27.146, daysAgo: 5 },
    { memberId: memberIds.zeynep, title: "Sabah Intervali", distanceM: 6800, movingTimeSec: 2040, polyline: KORDON_POLYLINE, startLat: 38.435, startLng: 27.140, daysAgo: 8 },

    // Mehmet — 2 runs (beginner)
    { memberId: memberIds.mehmet, title: "Ilk 5K Denemesi", distanceM: 5000, movingTimeSec: 2100, polyline: KORDON_POLYLINE, startLat: 38.435, startLng: 27.140, daysAgo: 2 },
    { memberId: memberIds.mehmet, title: "Park Kosusu", distanceM: 2800, movingTimeSec: 1260, polyline: KULTURPARK_POLYLINE, startLat: 38.428, startLng: 27.146, daysAgo: 6 },

    // Elif — 3 runs
    { memberId: memberIds.elif, title: "Kordon Gunbatimi", distanceM: 7000, movingTimeSec: 2640, polyline: KORDON_POLYLINE, startLat: 38.435, startLng: 27.140, daysAgo: 1 },
    { memberId: memberIds.elif, title: "Kulturpark Fartlek", distanceM: 4500, movingTimeSec: 1620, polyline: KULTURPARK_POLYLINE, startLat: 38.428, startLng: 27.146, daysAgo: 3 },
    { memberId: memberIds.elif, title: "Sahil Yolu", distanceM: 10200, movingTimeSec: 3900, polyline: GOZTEPE_POLYLINE, startLat: 38.395, startLng: 27.078, daysAgo: 10 },

    // Can — 3 runs (advanced)
    { memberId: memberIds.can, title: "Yaris Tempo Calismasi", distanceM: 12000, movingTimeSec: 3000, polyline: GOZTEPE_POLYLINE, startLat: 38.395, startLng: 27.078, daysAgo: 0 },
    { memberId: memberIds.can, title: "Easy Run Kordon", distanceM: 6000, movingTimeSec: 2280, polyline: KORDON_POLYLINE, startLat: 38.435, startLng: 27.140, daysAgo: 2 },
    { memberId: memberIds.can, title: "Korfez Uzun Kosu", distanceM: 21000, movingTimeSec: 6300, polyline: GOZTEPE_POLYLINE, startLat: 38.395, startLng: 27.078, daysAgo: 14 },
  ];

  for (const a of activityData) {
    const startTime = new Date(now.getTime() - a.daysAgo * 24 * 60 * 60 * 1000);
    const avgPace = a.distanceM > 0 ? (a.movingTimeSec / (a.distanceM / 1000)) : null;

    await db.insert(schema.activities).values({
      memberId: a.memberId,
      source: "manual",
      title: a.title,
      activityType: "Run",
      startTime,
      elapsedTimeSec: a.movingTimeSec + 120,
      movingTimeSec: a.movingTimeSec,
      distanceM: a.distanceM,
      avgPaceSecKm: avgPace,
      polylineEncoded: a.polyline,
      startLat: a.startLat,
      startLng: a.startLng,
      city: "Izmir",
      privacy: "public",
      sharedToBoard: true,
    }).onConflictDoNothing();
  }
  console.log(`✓ ${activityData.length} activities created`);

  // ── 4. RSVPs ──
  // Get created events
  const createdEvents = await db.select({ id: schema.events.id }).from(schema.events).limit(4);
  if (createdEvents.length > 0) {
    const rsvps = [
      { eventId: createdEvents[0]?.id, memberId: memberIds.ali },
      { eventId: createdEvents[0]?.id, memberId: memberIds.zeynep },
      { eventId: createdEvents[0]?.id, memberId: memberIds.elif },
      { eventId: createdEvents[1]?.id, memberId: memberIds.zeynep },
      { eventId: createdEvents[1]?.id, memberId: memberIds.can },
      { eventId: createdEvents[2]?.id, memberId: memberIds.can },
      { eventId: createdEvents[2]?.id, memberId: memberIds.zeynep },
      { eventId: createdEvents[3]?.id, memberId: memberIds.mehmet },
      { eventId: createdEvents[3]?.id, memberId: memberIds.ali },
    ].filter(r => r.eventId);

    for (const r of rsvps) {
      await db.insert(schema.eventRsvps).values({
        eventId: r.eventId!,
        memberId: r.memberId,
        status: "going",
      }).onConflictDoNothing();
    }
    console.log(`✓ ${rsvps.length} RSVPs created`);
  }

  console.log("\n✅ Seed complete! Events, Community, and Runs Explorer should now show data.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
