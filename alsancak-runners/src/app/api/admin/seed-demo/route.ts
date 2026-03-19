import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import { members, activities, events, eventRsvps } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// ── Google Polyline Encoder ──────────────────────────────────────────
function encodePolyline(coords: [number, number][]): string {
  let result = "";
  let plat = 0;
  let plng = 0;

  for (const [lat, lng] of coords) {
    const dlat = Math.round(lat * 1e5) - plat;
    const dlng = Math.round(lng * 1e5) - plng;
    plat += dlat;
    plng += dlng;
    result += encodeValue(dlat) + encodeValue(dlng);
  }
  return result;
}

function encodeValue(value: number): string {
  value = value < 0 ? ~(value << 1) : value << 1;
  let result = "";
  while (value >= 0x20) {
    result += String.fromCharCode((0x20 | (value & 0x1f)) + 63);
    value >>= 5;
  }
  result += String.fromCharCode(value + 63);
  return result;
}

// ── İzmir Routes (real coordinates) ─────────────────────────────────

// Alsancak Kordon Sahil Yolu (~5.2 km out and back)
const KORDON_ROUTE: [number, number][] = [
  [38.4352, 27.1425], // Alsancak İskele
  [38.4338, 27.1420],
  [38.4320, 27.1413],
  [38.4302, 27.1408],
  [38.4285, 27.1403],
  [38.4268, 27.1398],
  [38.4250, 27.1393],
  [38.4233, 27.1390],
  [38.4215, 27.1385],
  [38.4198, 27.1380],
  [38.4180, 27.1378], // Konak Meydanı yakını
  [38.4165, 27.1375],
  // dönüş
  [38.4180, 27.1377],
  [38.4198, 27.1381],
  [38.4215, 27.1386],
  [38.4233, 27.1391],
  [38.4250, 27.1395],
  [38.4268, 27.1400],
  [38.4285, 27.1405],
  [38.4302, 27.1410],
  [38.4320, 27.1415],
  [38.4338, 27.1421],
  [38.4352, 27.1425],
];

// Kültürpark Loop (~3.1 km)
const KULTURPARK_ROUTE: [number, number][] = [
  [38.4283, 27.1502], // Kültürpark giriş (Lozan kapı)
  [38.4292, 27.1508],
  [38.4302, 27.1518],
  [38.4308, 27.1532],
  [38.4305, 27.1548],
  [38.4295, 27.1558],
  [38.4280, 27.1560],
  [38.4268, 27.1552],
  [38.4262, 27.1538],
  [38.4265, 27.1522],
  [38.4272, 27.1510],
  [38.4283, 27.1502],
];

// Sahilyolu uzun rota (~8.5 km — Alsancak → Bostanlı)
const SAHILYOLU_ROUTE: [number, number][] = [
  [38.4352, 27.1425], // Alsancak İskele
  [38.4368, 27.1432],
  [38.4385, 27.1438],
  [38.4402, 27.1442],
  [38.4418, 27.1445],
  [38.4435, 27.1448],
  [38.4452, 27.1450],
  [38.4470, 27.1452],
  [38.4488, 27.1455], // Bostanlı sahil
  // dönüş
  [38.4470, 27.1453],
  [38.4452, 27.1451],
  [38.4435, 27.1449],
  [38.4418, 27.1446],
  [38.4402, 27.1443],
  [38.4385, 27.1439],
  [38.4368, 27.1433],
  [38.4352, 27.1426],
];

// Bornova Park loop (~2.8 km)
const BORNOVA_ROUTE: [number, number][] = [
  [38.4622, 27.2180], // Bornova Büyük Park
  [38.4630, 27.2192],
  [38.4638, 27.2208],
  [38.4635, 27.2225],
  [38.4625, 27.2235],
  [38.4612, 27.2238],
  [38.4600, 27.2230],
  [38.4595, 27.2215],
  [38.4600, 27.2198],
  [38.4610, 27.2185],
  [38.4622, 27.2180],
];

// Göztepe Sahil (~4 km)
const GOZTEPE_ROUTE: [number, number][] = [
  [38.3935, 27.0862], // Göztepe sahil
  [38.3920, 27.0855],
  [38.3905, 27.0850],
  [38.3888, 27.0845],
  [38.3870, 27.0842],
  [38.3855, 27.0840],
  [38.3840, 27.0838],
  // dönüş
  [38.3855, 27.0841],
  [38.3870, 27.0843],
  [38.3888, 27.0846],
  [38.3905, 27.0851],
  [38.3920, 27.0856],
  [38.3935, 27.0862],
];

// POST /api/admin/seed-demo — Create demo accounts + activities for İzmir
export async function POST(request: NextRequest) {
  // Auth check — admin only
  const user = await getRequestUser(request);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const passwordHash = await bcrypt.hash("demo1234", 12);
  const created: string[] = [];

  // ── Demo Members ────────────────────────────────────────
  const demoMembers = [
    { name: "Emre Yıldız", email: "emre@demo.alsancak.run", paceGroup: "A (4:30-5:00)" },
    { name: "Ayşe Konak", email: "ayse@demo.alsancak.run", paceGroup: "B (5:00-5:30)" },
    { name: "Can Bostancı", email: "can@demo.alsancak.run", paceGroup: "B (5:00-5:30)" },
  ];

  const memberIds: string[] = [];

  for (const m of demoMembers) {
    // Skip if already exists
    const [existing] = await db
      .select({ id: members.id })
      .from(members)
      .where(eq(members.email, m.email))
      .limit(1);

    if (existing) {
      memberIds.push(existing.id);
      created.push(`${m.name} (mevcut)`);
      continue;
    }

    const [member] = await db
      .insert(members)
      .values({
        name: m.name,
        email: m.email,
        passwordHash,
        paceGroup: m.paceGroup,
        role: "member",
        privacy: "public",
        onboardingDone: true,
      })
      .returning({ id: members.id });

    memberIds.push(member.id);
    created.push(`${m.name} (oluşturuldu)`);
  }

  // ── Demo Activities ─────────────────────────────────────
  const now = new Date();

  const demoActivities = [
    // Emre — Kordon sabah koşusu (bugün)
    {
      memberId: memberIds[0],
      title: "Kordon Sabah Koşusu",
      activityType: "Run",
      startTime: new Date(now.getTime() - 3 * 3600_000), // 3 saat önce
      distanceM: 5200,
      movingTimeSec: 1560, // 26 min → 5:00/km pace
      elapsedTimeSec: 1620,
      elevationGainM: 12,
      avgPaceSecKm: 300,
      polylineEncoded: encodePolyline(KORDON_ROUTE),
      startLat: KORDON_ROUTE[0][0],
      startLng: KORDON_ROUTE[0][1],
      endLat: KORDON_ROUTE[KORDON_ROUTE.length - 1][0],
      endLng: KORDON_ROUTE[KORDON_ROUTE.length - 1][1],
    },
    // Emre — Sahilyolu uzun (2 gün önce)
    {
      memberId: memberIds[0],
      title: "Sahilyolu Uzun Koşu",
      activityType: "Run",
      startTime: new Date(now.getTime() - 2 * 86400_000 - 5 * 3600_000),
      distanceM: 8500,
      movingTimeSec: 2550, // 42:30 → 5:00/km
      elapsedTimeSec: 2700,
      elevationGainM: 18,
      avgPaceSecKm: 300,
      polylineEncoded: encodePolyline(SAHILYOLU_ROUTE),
      startLat: SAHILYOLU_ROUTE[0][0],
      startLng: SAHILYOLU_ROUTE[0][1],
      endLat: SAHILYOLU_ROUTE[SAHILYOLU_ROUTE.length - 1][0],
      endLng: SAHILYOLU_ROUTE[SAHILYOLU_ROUTE.length - 1][1],
    },
    // Ayşe — Kültürpark (dün)
    {
      memberId: memberIds[1],
      title: "Kültürpark Akşam Turu",
      activityType: "Run",
      startTime: new Date(now.getTime() - 86400_000 - 2 * 3600_000),
      distanceM: 3100,
      movingTimeSec: 1085, // 18:05 → 5:30/km
      elapsedTimeSec: 1140,
      elevationGainM: 8,
      avgPaceSecKm: 330,
      polylineEncoded: encodePolyline(KULTURPARK_ROUTE),
      startLat: KULTURPARK_ROUTE[0][0],
      startLng: KULTURPARK_ROUTE[0][1],
      endLat: KULTURPARK_ROUTE[KULTURPARK_ROUTE.length - 1][0],
      endLng: KULTURPARK_ROUTE[KULTURPARK_ROUTE.length - 1][1],
    },
    // Ayşe — Kordon (3 gün önce)
    {
      memberId: memberIds[1],
      title: "Kordon Tempo Koşusu",
      activityType: "Run",
      startTime: new Date(now.getTime() - 3 * 86400_000 - 7 * 3600_000),
      distanceM: 5200,
      movingTimeSec: 1430, // 23:50 → 4:35/km
      elapsedTimeSec: 1500,
      elevationGainM: 12,
      avgPaceSecKm: 275,
      polylineEncoded: encodePolyline(KORDON_ROUTE),
      startLat: KORDON_ROUTE[0][0],
      startLng: KORDON_ROUTE[0][1],
      endLat: KORDON_ROUTE[KORDON_ROUTE.length - 1][0],
      endLng: KORDON_ROUTE[KORDON_ROUTE.length - 1][1],
    },
    // Can — Bornova (bugün)
    {
      memberId: memberIds[2],
      title: "Bornova Park Koşusu",
      activityType: "Run",
      startTime: new Date(now.getTime() - 6 * 3600_000),
      distanceM: 2800,
      movingTimeSec: 980, // 16:20 → 5:50/km
      elapsedTimeSec: 1050,
      elevationGainM: 15,
      avgPaceSecKm: 350,
      polylineEncoded: encodePolyline(BORNOVA_ROUTE),
      startLat: BORNOVA_ROUTE[0][0],
      startLng: BORNOVA_ROUTE[0][1],
      endLat: BORNOVA_ROUTE[BORNOVA_ROUTE.length - 1][0],
      endLng: BORNOVA_ROUTE[BORNOVA_ROUTE.length - 1][1],
    },
    // Can — Göztepe sahil (4 gün önce)
    {
      memberId: memberIds[2],
      title: "Göztepe Sahil Koşusu",
      activityType: "Run",
      startTime: new Date(now.getTime() - 4 * 86400_000 - 8 * 3600_000),
      distanceM: 4000,
      movingTimeSec: 1320, // 22:00 → 5:30/km
      elapsedTimeSec: 1400,
      elevationGainM: 10,
      avgPaceSecKm: 330,
      polylineEncoded: encodePolyline(GOZTEPE_ROUTE),
      startLat: GOZTEPE_ROUTE[0][0],
      startLng: GOZTEPE_ROUTE[0][1],
      endLat: GOZTEPE_ROUTE[GOZTEPE_ROUTE.length - 1][0],
      endLng: GOZTEPE_ROUTE[GOZTEPE_ROUTE.length - 1][1],
    },
    // Emre — Kültürpark (5 gün önce)
    {
      memberId: memberIds[0],
      title: "Kültürpark Toparlanma",
      activityType: "Run",
      startTime: new Date(now.getTime() - 5 * 86400_000 - 4 * 3600_000),
      distanceM: 3100,
      movingTimeSec: 1116, // 18:36 → 6:00/km (toparlanma temposu)
      elapsedTimeSec: 1200,
      elevationGainM: 8,
      avgPaceSecKm: 360,
      polylineEncoded: encodePolyline(KULTURPARK_ROUTE),
      startLat: KULTURPARK_ROUTE[0][0],
      startLng: KULTURPARK_ROUTE[0][1],
      endLat: KULTURPARK_ROUTE[KULTURPARK_ROUTE.length - 1][0],
      endLng: KULTURPARK_ROUTE[KULTURPARK_ROUTE.length - 1][1],
    },
  ];

  let activityCount = 0;
  for (const a of demoActivities) {
    await db.insert(activities).values({
      ...a,
      source: "gps",
      privacy: "public",
      sharedToBoard: true,
      city: "Izmir",
    });
    activityCount++;
  }

  // ── Demo Events ─────────────────────────────────────────
  const nextSaturday = new Date(now);
  nextSaturday.setDate(now.getDate() + (6 - now.getDay()) % 7 + (now.getDay() === 6 ? 7 : 0));
  nextSaturday.setHours(7, 30, 0, 0);

  const nextWednesday = new Date(now);
  nextWednesday.setDate(now.getDate() + (3 - now.getDay() + 7) % 7);
  if (nextWednesday <= now) nextWednesday.setDate(nextWednesday.getDate() + 7);
  nextWednesday.setHours(19, 0, 0, 0);

  const nextSunday = new Date(nextSaturday);
  nextSunday.setDate(nextSaturday.getDate() + 1);
  nextSunday.setHours(8, 0, 0, 0);

  const demoEvents = [
    {
      title: "Haftalık Kordon Koşusu",
      slug: `haftalik-kordon-kosusu-${Date.now().toString(36)}`,
      description: "Her cumartesi sabahı Alsancak Kordon boyunca grup koşusu. Tüm seviyelere açık!",
      eventType: "group_run",
      date: nextSaturday,
      meetingPoint: "Alsancak İskele",
      meetingLat: 38.4352,
      meetingLng: 27.1425,
      distanceM: 5000,
      status: "upcoming",
      createdBy: memberIds[0],
    },
    {
      title: "Kültürpark Tempo Antrenmanı",
      slug: `kulturpark-tempo-antrenmani-${Date.now().toString(36)}`,
      description: "Çarşamba akşamı tempo antrenmanı. 3x1km interval, arada 400m yürüyüş.",
      eventType: "group_run",
      date: nextWednesday,
      meetingPoint: "Kültürpark Lozan Kapısı",
      meetingLat: 38.4283,
      meetingLng: 27.1502,
      distanceM: 6000,
      status: "upcoming",
      createdBy: memberIds[0],
    },
    {
      title: "Pazar Uzun Koşu",
      slug: `pazar-uzun-kosu-${Date.now().toString(36)}`,
      description: "Sahilyolu boyunca uzun mesafe antrenmanı. Bostanlı'ya kadar gidip dönüyoruz.",
      eventType: "group_run",
      date: nextSunday,
      meetingPoint: "Alsancak İskele",
      meetingLat: 38.4352,
      meetingLng: 27.1425,
      distanceM: 10000,
      status: "upcoming",
      createdBy: memberIds[0],
    },
  ];

  const eventIds: string[] = [];
  for (const e of demoEvents) {
    const [event] = await db.insert(events).values(e).returning({ id: events.id });
    eventIds.push(event.id);
  }

  // Auto-RSVP some members to events
  const rsvps = [
    { eventId: eventIds[0], memberId: memberIds[0] },
    { eventId: eventIds[0], memberId: memberIds[1] },
    { eventId: eventIds[0], memberId: memberIds[2] },
    { eventId: eventIds[1], memberId: memberIds[0] },
    { eventId: eventIds[1], memberId: memberIds[1] },
    { eventId: eventIds[2], memberId: memberIds[0] },
    { eventId: eventIds[2], memberId: memberIds[2] },
  ];

  for (const r of rsvps) {
    await db.insert(eventRsvps).values({ ...r, status: "going" }).onConflictDoNothing();
  }

  return NextResponse.json({
    success: true,
    summary: {
      members: created,
      activities: activityCount,
      events: demoEvents.map((e) => e.title),
      rsvps: rsvps.length,
    },
    credentials: {
      password: "demo1234",
      emails: demoMembers.map((m) => m.email),
    },
  });
}
