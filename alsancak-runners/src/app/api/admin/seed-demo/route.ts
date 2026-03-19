import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import { members, activities, events, eventRsvps, badges } from "@/db/schema";
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

// ── İzmir Routes (real GPS coordinates from MapMyRun traces) ────────

// Alsancak Kordon Sahil Yolu (~5.2 km) — Real coastline promenade
// Source: MapMyRun route 4768966297, first ~5km section (Alsancak to Konak area)
// The Kordon curves WEST significantly as you go south (lng drops from ~27.14 to ~27.13)
const KORDON_ROUTE: [number, number][] = [
  [38.44226, 27.14340], // Alsancak İskele (start)
  [38.44219, 27.14298],
  [38.44225, 27.14290],
  [38.44225, 27.14284],
  [38.44222, 27.14279],
  [38.44212, 27.14269],
  [38.44180, 27.14244],
  [38.44170, 27.14238],
  [38.43886, 27.14128], // Cumhuriyet Meydanı area
  [38.43766, 27.14080],
  [38.43710, 27.14050],
  [38.43683, 27.14033],
  [38.43668, 27.14020],
  [38.43623, 27.13979],
  [38.43624, 27.13964],
  [38.43610, 27.13945],
  [38.43572, 27.13906],
  [38.43535, 27.13881],
  [38.43443, 27.13796],
  [38.43292, 27.13654], // Pasaport ferry area
  [38.43203, 27.13575],
  [38.43183, 27.13553],
  [38.43168, 27.13535],
  [38.43133, 27.13485],
  [38.43078, 27.13403],
  [38.43058, 27.13383],
  [38.43046, 27.13376],
  [38.43038, 27.13376],
  [38.43031, 27.13384],
  [38.42976, 27.13436],
  [38.42970, 27.13432],
  [38.42882, 27.13350],
  [38.42765, 27.13248],
  [38.42752, 27.13240],
  [38.42731, 27.13233],
  [38.42690, 27.13222],
  [38.42611, 27.13202],
  [38.42469, 27.13159],
  [38.42335, 27.13087], // Konak Meydanı area
  [38.42269, 27.13048],
  [38.42262, 27.13045],
  [38.42237, 27.13028],
  [38.42209, 27.13007],
  [38.42197, 27.12996],
  [38.42185, 27.12980],
  [38.42178, 27.12967], // Turnaround near Konak
  // Dönüş (return along same waterfront)
  [38.42185, 27.12981],
  [38.42197, 27.12997],
  [38.42209, 27.13008],
  [38.42237, 27.13029],
  [38.42262, 27.13046],
  [38.42335, 27.13088],
  [38.42469, 27.13160],
  [38.42611, 27.13203],
  [38.42690, 27.13223],
  [38.42731, 27.13234],
  [38.42765, 27.13249],
  [38.42882, 27.13351],
  [38.42970, 27.13433],
  [38.43031, 27.13385],
  [38.43046, 27.13377],
  [38.43078, 27.13404],
  [38.43133, 27.13486],
  [38.43168, 27.13536],
  [38.43203, 27.13576],
  [38.43292, 27.13655],
  [38.43443, 27.13797],
  [38.43535, 27.13882],
  [38.43572, 27.13907],
  [38.43624, 27.13965],
  [38.43668, 27.14021],
  [38.43710, 27.14051],
  [38.43766, 27.14081],
  [38.43886, 27.14129],
  [38.44170, 27.14239],
  [38.44212, 27.14270],
  [38.44222, 27.14280],
  [38.44226, 27.14340], // Finish at İskele
];

// Kültürpark Loop (~3.1 km) — Real perimeter path
// Source: MapMyRun route 4770702607 (Kültürpark & Waterfront route)
// Park bounded by: Mustafa Enver Bey Ave (N), Bozkurt Ave (E), Mürsel Paşa Blvd (S), Şair Eşref Blvd (W)
const KULTURPARK_ROUTE: [number, number][] = [
  [38.42888, 27.13498], // Lozan Kapısı (start/finish)
  [38.42904, 27.13496],
  [38.42933, 27.13490],
  [38.42897, 27.13509],
  [38.42883, 27.13507],
  [38.42878, 27.13552],
  [38.42869, 27.13618],
  [38.42850, 27.13741],
  [38.42798, 27.14087], // Eastern edge
  [38.42808, 27.14095],
  [38.42813, 27.14102],
  [38.42819, 27.14118],
  [38.42818, 27.14128],
  [38.42813, 27.14144],
  [38.42803, 27.14153],
  [38.42797, 27.14154],
  [38.42788, 27.14153],
  [38.42784, 27.14177],
  [38.42880, 27.14197], // Northern edge
  [38.42915, 27.14208],
  [38.42975, 27.14225],
  [38.43003, 27.14236],
  [38.43023, 27.14248],
  [38.43049, 27.14268],
  [38.43069, 27.14289],
  [38.43082, 27.14308],
  [38.43091, 27.14325],
  [38.43110, 27.14387],
  [38.43114, 27.14415], // NE corner
  [38.43113, 27.14463],
  [38.43086, 27.14593],
  [38.43067, 27.14680],
  [38.43053, 27.14750],
  [38.43033, 27.14816],
  [38.43017, 27.14848],
  [38.42979, 27.14891], // Eastern side heading south
  [38.42938, 27.14914],
  [38.42891, 27.14931],
  [38.42848, 27.14938],
  [38.42808, 27.14935],
  [38.42785, 27.14926],
  [38.42765, 27.14914],
  [38.42739, 27.14893],
  [38.42689, 27.14834], // SE corner area
  [38.42651, 27.14787],
  [38.42623, 27.14747],
  [38.42613, 27.14727],
  [38.42608, 27.14712],
  [38.42597, 27.14665],
  [38.42597, 27.14638],
  [38.42599, 27.14616], // Southern edge
  [38.42609, 27.14522],
  [38.42618, 27.14451],
  [38.42619, 27.14380],
  [38.42644, 27.14305],
  [38.42650, 27.14293],
  [38.42672, 27.14253],
  [38.42682, 27.14243],
  [38.42707, 27.14218], // SW area heading back west
  [38.42749, 27.14188],
  [38.42770, 27.14181],
  [38.42784, 27.14177],
  [38.42983, 27.14185],
  [38.42997, 27.14172],
  [38.43017, 27.14162],
  [38.43036, 27.14152],
  [38.43062, 27.14145], // Western edge heading south
  [38.43118, 27.14135],
  [38.43173, 27.14122],
  [38.43264, 27.14102],
  [38.43344, 27.14084],
  [38.43383, 27.14078],
  [38.43462, 27.14053],
  [38.43487, 27.14040],
  [38.43500, 27.14033],
  [38.43534, 27.14012],
  [38.43557, 27.13969],
  [38.43572, 27.13906], // Heading back toward start
  [38.43535, 27.13881],
  [38.43359, 27.13717],
  [38.43320, 27.13680],
  [38.43203, 27.13575],
  [38.43183, 27.13553],
  [38.43138, 27.13547],
  [38.43059, 27.13476],
  [38.43026, 27.13449],
  [38.43007, 27.13444],
  [38.42990, 27.13445],
  [38.42976, 27.13436],
  [38.42962, 27.13432],
  [38.42950, 27.13444],
  [38.42946, 27.13450],
  [38.42888, 27.13498], // Back to Lozan Kapısı
];

// Sahilyolu uzun rota (~8.5 km — Alsancak → Karşıyaka/Bostanlı)
// Source: MapMyRun route 4769023243 (Karşıyaka Waterfront Path)
// Follows Mustafa Kemal Coastal Blvd along the north shore of İzmir Bay
const SAHILYOLU_ROUTE: [number, number][] = [
  [38.44226, 27.14340], // Alsancak İskele (start)
  [38.44219, 27.14298],
  [38.44180, 27.14244],
  [38.44170, 27.14238],
  [38.43886, 27.14128],
  [38.43766, 27.14080], // Heading north along coast
  [38.43710, 27.14050],
  [38.43683, 27.14033],
  [38.43623, 27.13979],
  [38.43572, 27.13906],
  [38.43535, 27.13881],
  [38.43443, 27.13796],
  [38.43292, 27.13654],
  [38.43203, 27.13575],
  [38.43133, 27.13485],
  [38.43078, 27.13403],
  [38.43038, 27.13376],
  [38.42976, 27.13436], // Konak area, continue north
  [38.42882, 27.13350],
  [38.42765, 27.13248],
  [38.42611, 27.13202],
  [38.42469, 27.13159],
  [38.42335, 27.13087],
  [38.42269, 27.13048],
  [38.42209, 27.13007],
  [38.42178, 27.12967],
  [38.42158, 27.12911],
  [38.42145, 27.12872],
  [38.42084, 27.12809],
  [38.42051, 27.12765],
  [38.42027, 27.12745], // Passing İnciraltı area
  [38.41964, 27.12701],
  [38.41919, 27.12651],
  [38.41870, 27.12636],
  [38.41842, 27.12620],
  [38.41827, 27.12583],
  [38.41794, 27.12567],
  [38.41743, 27.12475],
  [38.41752, 27.12377],
  [38.41727, 27.12334],
  [38.41706, 27.12300], // Bayraklı coastal area
  [38.41577, 27.12286],
  [38.41554, 27.12273],
  [38.41518, 27.12240],
  [38.41446, 27.12153],
  [38.41413, 27.12121],
  [38.41386, 27.12102],
  [38.41344, 27.12086],
  [38.41279, 27.12062],
  [38.41220, 27.12033],
  [38.41156, 27.11998],
  [38.41116, 27.11955],
  [38.41094, 27.11923], // Bostanlı approach
  [38.41066, 27.11869],
  [38.41050, 27.11825],
  [38.41036, 27.11760],
  [38.41022, 27.11670],
  [38.41009, 27.11560],
  [38.41003, 27.11488],
  [38.40997, 27.11389], // Bostanlı sahil (turnaround)
  // Dönüş (return)
  [38.41003, 27.11489],
  [38.41009, 27.11561],
  [38.41022, 27.11671],
  [38.41036, 27.11761],
  [38.41050, 27.11826],
  [38.41066, 27.11870],
  [38.41094, 27.11924],
  [38.41156, 27.11999],
  [38.41220, 27.12034],
  [38.41279, 27.12063],
  [38.41386, 27.12103],
  [38.41446, 27.12154],
  [38.41518, 27.12241],
  [38.41577, 27.12287],
  [38.41706, 27.12301],
  [38.41752, 27.12378],
  [38.41794, 27.12568],
  [38.41842, 27.12621],
  [38.41870, 27.12637],
  [38.41964, 27.12702],
  [38.42027, 27.12746],
  [38.42145, 27.12873],
  [38.42209, 27.13008],
  [38.42335, 27.13088],
  [38.42611, 27.13203],
  [38.42882, 27.13351],
  [38.43078, 27.13404],
  [38.43203, 27.13576],
  [38.43443, 27.13797],
  [38.43572, 27.13907],
  [38.43683, 27.14034],
  [38.43886, 27.14129],
  [38.44170, 27.14239],
  [38.44226, 27.14341], // Finish at İskele
];

// Bornova Park loop (~2.8 km)
// Bornova Büyük Park perimeter with more interpolated points for smooth curves
const BORNOVA_ROUTE: [number, number][] = [
  [38.46220, 27.21800], // Bornova Büyük Park entrance
  [38.46245, 27.21830],
  [38.46270, 27.21865],
  [38.46290, 27.21900],
  [38.46305, 27.21940],
  [38.46315, 27.21985],
  [38.46320, 27.22030],
  [38.46318, 27.22075],
  [38.46310, 27.22120],
  [38.46295, 27.22160],
  [38.46275, 27.22195],
  [38.46250, 27.22225],
  [38.46220, 27.22248],
  [38.46188, 27.22262],
  [38.46155, 27.22270],
  [38.46120, 27.22272],
  [38.46088, 27.22265],
  [38.46058, 27.22250],
  [38.46032, 27.22228],
  [38.46012, 27.22200],
  [38.45998, 27.22168],
  [38.45990, 27.22132],
  [38.45988, 27.22095],
  [38.45992, 27.22058],
  [38.46002, 27.22022],
  [38.46018, 27.21990],
  [38.46038, 27.21962],
  [38.46062, 27.21938],
  [38.46090, 27.21918],
  [38.46120, 27.21902],
  [38.46152, 27.21890],
  [38.46185, 27.21885],
  [38.46220, 27.21800], // Back to entrance
];

// Göztepe Sahil (~4 km)
// Source: MapMyRun route 4768966297, southern section (Göztepe/İnciraltı area)
const GOZTEPE_ROUTE: [number, number][] = [
  [38.40999, 27.11346], // Göztepe sahil (start)
  [38.41007, 27.11238],
  [38.41009, 27.11202],
  [38.41010, 27.11144],
  [38.41007, 27.11113],
  [38.41002, 27.11086],
  [38.40990, 27.11054],
  [38.40974, 27.11021],
  [38.40958, 27.10995],
  [38.40950, 27.10975],
  [38.40941, 27.10943],
  [38.40936, 27.10918],
  [38.40917, 27.10879],
  [38.40893, 27.10830], // Mid-route
  [38.40862, 27.10759],
  [38.40845, 27.10692],
  [38.40842, 27.10667],
  [38.40840, 27.10627],
  [38.40839, 27.10598],
  [38.40838, 27.10524],
  [38.40830, 27.10453],
  [38.40824, 27.10420],
  [38.40777, 27.10251], // Turnaround
  // Dönüş
  [38.40824, 27.10421],
  [38.40830, 27.10454],
  [38.40838, 27.10525],
  [38.40839, 27.10599],
  [38.40840, 27.10628],
  [38.40845, 27.10693],
  [38.40862, 27.10760],
  [38.40893, 27.10831],
  [38.40917, 27.10880],
  [38.40936, 27.10919],
  [38.40958, 27.10996],
  [38.40974, 27.11022],
  [38.40990, 27.11055],
  [38.41007, 27.11114],
  [38.41010, 27.11145],
  [38.41009, 27.11203],
  [38.40999, 27.11346], // Finish
];

// POST /api/admin/seed-demo — Create demo accounts + activities for İzmir
export async function POST(request: NextRequest) {
  // Auth check: admin OR seed secret
  const seedSecret = request.headers.get("x-seed-secret");
  if (seedSecret === process.env.AUTH_SECRET) {
    // Seed secret matches — allow
  } else {
    const user = await getRequestUser(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
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

  // ── Seed Badges ───────────────────────────────────────
  const badgeDefs = [
    { slug: "first_run", name: "İlk Adım", description: "İlk koşunu tamamla", iconEmoji: "👣", category: "milestone", triggerType: "first_run", triggerValue: 1 },
    { slug: "runs_5", name: "Düzenli Koşucu", description: "5 koşu tamamla", iconEmoji: "🏃", category: "milestone", triggerType: "runs_count", triggerValue: 5 },
    { slug: "runs_10", name: "Kararlı Koşucu", description: "10 koşu tamamla", iconEmoji: "💪", category: "milestone", triggerType: "runs_count", triggerValue: 10 },
    { slug: "runs_50", name: "Maraton Ruhu", description: "50 koşu tamamla", iconEmoji: "🔥", category: "milestone", triggerType: "runs_count", triggerValue: 50 },
    { slug: "first_5k", name: "5K Kulübü", description: "Tek seferde 5km koş", iconEmoji: "⭐", category: "distance", triggerType: "single_run_distance", triggerValue: 5000 },
    { slug: "first_10k", name: "10K Kulübü", description: "Tek seferde 10km koş", iconEmoji: "🏅", category: "distance", triggerType: "single_run_distance", triggerValue: 10000 },
    { slug: "half_marathon", name: "Yarı Maraton", description: "Tek seferde 21.1km koş", iconEmoji: "🫡", category: "distance", triggerType: "single_run_distance", triggerValue: 21100 },
    { slug: "marathon", name: "Maratoncu", description: "Tek seferde 42.195km koş", iconEmoji: "🌟", category: "distance", triggerType: "single_run_distance", triggerValue: 42195 },
    { slug: "total_50k", name: "50K Toplam", description: "Toplam 50km koş", iconEmoji: "🚶", category: "total", triggerType: "total_distance", triggerValue: 50000 },
    { slug: "total_100k", name: "100K Kulübü", description: "Toplam 100km koş", iconEmoji: "🚀", category: "total", triggerType: "total_distance", triggerValue: 100000 },
    { slug: "total_500k", name: "500K Efsane", description: "Toplam 500km koş", iconEmoji: "👑", category: "total", triggerType: "total_distance", triggerValue: 500000 },
    { slug: "pace_under_5", name: "Hız Şeytanı", description: "5:00/km altında tempo", iconEmoji: "⚡", category: "speed", triggerType: "pace_under", triggerValue: 300 },
    { slug: "pace_under_430", name: "Rüzgar Gibi", description: "4:30/km altında tempo", iconEmoji: "🌪️", category: "speed", triggerType: "pace_under", triggerValue: 270 },
    { slug: "pace_under_4", name: "Sonic", description: "4:00/km altında tempo", iconEmoji: "💨", category: "speed", triggerType: "pace_under", triggerValue: 240 },
  ];

  let badgeCount = 0;
  for (const b of badgeDefs) {
    await db.insert(badges).values(b).onConflictDoNothing();
    badgeCount++;
  }

  return NextResponse.json({
    success: true,
    summary: {
      members: created,
      activities: activityCount,
      events: demoEvents.map((e) => e.title),
      rsvps: rsvps.length,
      badges: badgeCount,
    },
    credentials: {
      password: "demo1234",
      emails: demoMembers.map((m) => m.email),
    },
  });
}
