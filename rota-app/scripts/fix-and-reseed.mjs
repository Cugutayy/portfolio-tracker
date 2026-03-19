const API = "https://alsancak-runners.vercel.app";

async function login(email) {
  const res = await fetch(`${API}/api/auth/mobile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "demo1234" })
  });
  return (await res.json()).accessToken;
}

async function fixNameAndDeleteActivities(token, newName) {
  // Fix name
  const patchRes = await fetch(`${API}/api/members/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: newName })
  });
  const patch = await patchRes.json();
  console.log(`  Name fixed: ${patch.name}`);

  // Get activities to delete
  const actRes = await fetch(`${API}/api/activities?page=1&limit=50`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const acts = await actRes.json();
  console.log(`  Activities to delete: ${acts.activities?.length || 0}`);

  for (const a of (acts.activities || [])) {
    const delRes = await fetch(`${API}/api/activities/${a.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`    Deleted ${a.title}: ${delRes.status}`);
  }
  return token;
}

// Polyline encoder
function encode(coords) {
  let r = "", plat = 0, plng = 0;
  for (const [lat, lng] of coords) {
    const dlat = Math.round(lat * 1e5) - plat;
    const dlng = Math.round(lng * 1e5) - plng;
    plat += dlat; plng += dlng;
    r += ev(dlat) + ev(dlng);
  }
  return r;
}
function ev(v) {
  v = v < 0 ? ~(v << 1) : v << 1;
  let r = "";
  while (v >= 0x20) { r += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5; }
  r += String.fromCharCode(v + 63);
  return r;
}

// Real GPS routes from MapMyRun traces
const KORDON = [
  [38.44226,27.14340],[38.44219,27.14298],[38.44225,27.14290],[38.44225,27.14284],[38.44222,27.14279],
  [38.44212,27.14269],[38.44180,27.14244],[38.44170,27.14238],[38.43886,27.14128],[38.43766,27.14080],
  [38.43710,27.14050],[38.43683,27.14033],[38.43668,27.14020],[38.43623,27.13979],[38.43624,27.13964],
  [38.43610,27.13945],[38.43572,27.13906],[38.43535,27.13881],[38.43443,27.13796],[38.43292,27.13654],
  [38.43203,27.13575],[38.43183,27.13553],[38.43168,27.13535],[38.43133,27.13485],[38.43078,27.13403],
  [38.43058,27.13383],[38.43046,27.13376],[38.43038,27.13376],[38.43031,27.13384],[38.42976,27.13436],
  [38.42970,27.13432],[38.42882,27.13350],[38.42765,27.13248],[38.42752,27.13240],[38.42731,27.13233],
  [38.42690,27.13222],[38.42611,27.13202],[38.42469,27.13159],[38.42335,27.13087],[38.42269,27.13048],
  [38.42237,27.13028],[38.42209,27.13007],[38.42197,27.12996],[38.42185,27.12980],[38.42178,27.12967],
  [38.42185,27.12981],[38.42197,27.12997],[38.42209,27.13008],[38.42237,27.13029],[38.42269,27.13049],
  [38.42335,27.13088],[38.42469,27.13160],[38.42611,27.13203],[38.42690,27.13223],[38.42731,27.13234],
  [38.42765,27.13249],[38.42882,27.13351],[38.42970,27.13433],[38.43031,27.13385],[38.43046,27.13377],
  [38.43078,27.13404],[38.43133,27.13486],[38.43203,27.13576],[38.43292,27.13655],[38.43443,27.13797],
  [38.43535,27.13882],[38.43572,27.13907],[38.43624,27.13965],[38.43668,27.14021],[38.43710,27.14051],
  [38.43766,27.14081],[38.43886,27.14129],[38.44170,27.14239],[38.44212,27.14270],[38.44226,27.14340],
];

const KULTURPARK = [
  [38.42888,27.13498],[38.42904,27.13496],[38.42933,27.13490],[38.42897,27.13509],[38.42883,27.13507],
  [38.42878,27.13552],[38.42869,27.13618],[38.42850,27.13741],[38.42798,27.14087],[38.42808,27.14095],
  [38.42813,27.14102],[38.42819,27.14118],[38.42818,27.14128],[38.42813,27.14144],[38.42803,27.14153],
  [38.42797,27.14154],[38.42788,27.14153],[38.42784,27.14177],[38.42880,27.14197],[38.42915,27.14208],
  [38.42975,27.14225],[38.43003,27.14236],[38.43023,27.14248],[38.43049,27.14268],[38.43069,27.14289],
  [38.43082,27.14308],[38.43091,27.14325],[38.43110,27.14387],[38.43114,27.14415],[38.43113,27.14463],
  [38.43086,27.14593],[38.43067,27.14680],[38.43053,27.14750],[38.43033,27.14816],[38.43017,27.14848],
  [38.42979,27.14891],[38.42938,27.14914],[38.42891,27.14931],[38.42848,27.14938],[38.42808,27.14935],
  [38.42785,27.14926],[38.42765,27.14914],[38.42739,27.14893],[38.42689,27.14834],[38.42651,27.14787],
  [38.42623,27.14747],[38.42613,27.14727],[38.42608,27.14712],[38.42597,27.14665],[38.42597,27.14638],
  [38.42599,27.14616],[38.42609,27.14522],[38.42618,27.14451],[38.42619,27.14380],[38.42644,27.14305],
  [38.42650,27.14293],[38.42672,27.14253],[38.42682,27.14243],[38.42707,27.14218],[38.42749,27.14188],
  [38.42770,27.14181],[38.42784,27.14177],[38.42983,27.14185],[38.42997,27.14172],[38.43017,27.14162],
  [38.43036,27.14152],[38.43062,27.14145],[38.43118,27.14135],[38.43173,27.14122],[38.43264,27.14102],
  [38.43344,27.14084],[38.43383,27.14078],[38.43462,27.14053],[38.43487,27.14040],[38.43500,27.14033],
  [38.43534,27.14012],[38.43557,27.13969],[38.43572,27.13906],[38.43535,27.13881],[38.43359,27.13717],
  [38.43320,27.13680],[38.43203,27.13575],[38.43183,27.13553],[38.43138,27.13547],[38.43059,27.13476],
  [38.43026,27.13449],[38.43007,27.13444],[38.42990,27.13445],[38.42976,27.13436],[38.42962,27.13432],
  [38.42950,27.13444],[38.42946,27.13450],[38.42888,27.13498],
];

const BORNOVA = [
  [38.46220,27.21800],[38.46245,27.21830],[38.46270,27.21865],[38.46290,27.21900],[38.46305,27.21940],
  [38.46315,27.21985],[38.46320,27.22030],[38.46318,27.22075],[38.46310,27.22120],[38.46295,27.22160],
  [38.46275,27.22195],[38.46250,27.22225],[38.46220,27.22248],[38.46188,27.22262],[38.46155,27.22270],
  [38.46120,27.22272],[38.46088,27.22265],[38.46058,27.22250],[38.46032,27.22228],[38.46012,27.22200],
  [38.45998,27.22168],[38.45990,27.22132],[38.45988,27.22095],[38.45992,27.22058],[38.46002,27.22022],
  [38.46018,27.21990],[38.46038,27.21962],[38.46062,27.21938],[38.46090,27.21918],[38.46120,27.21902],
  [38.46152,27.21890],[38.46185,27.21885],[38.46220,27.21800],
];

const GOZTEPE = [
  [38.40999,27.11346],[38.41007,27.11238],[38.41009,27.11202],[38.41010,27.11144],[38.41007,27.11113],
  [38.41002,27.11086],[38.40990,27.11054],[38.40974,27.11021],[38.40958,27.10995],[38.40950,27.10975],
  [38.40941,27.10943],[38.40936,27.10918],[38.40917,27.10879],[38.40893,27.10830],[38.40862,27.10759],
  [38.40845,27.10692],[38.40842,27.10667],[38.40840,27.10627],[38.40839,27.10598],[38.40838,27.10524],
  [38.40830,27.10453],[38.40824,27.10420],[38.40777,27.10251],
  [38.40824,27.10421],[38.40830,27.10454],[38.40838,27.10525],[38.40839,27.10599],[38.40840,27.10628],
  [38.40845,27.10693],[38.40862,27.10760],[38.40893,27.10831],[38.40917,27.10880],[38.40936,27.10919],
  [38.40958,27.10996],[38.40974,27.11022],[38.40990,27.11055],[38.41007,27.11114],[38.41010,27.11145],
  [38.41009,27.11203],[38.40999,27.11346],
];

const SAHILYOLU = [
  [38.44226,27.14340],[38.44219,27.14298],[38.44180,27.14244],[38.44170,27.14238],[38.43886,27.14128],
  [38.43766,27.14080],[38.43710,27.14050],[38.43683,27.14033],[38.43623,27.13979],[38.43572,27.13906],
  [38.43535,27.13881],[38.43443,27.13796],[38.43292,27.13654],[38.43203,27.13575],[38.43133,27.13485],
  [38.43078,27.13403],[38.43038,27.13376],[38.42976,27.13436],[38.42882,27.13350],[38.42765,27.13248],
  [38.42611,27.13202],[38.42469,27.13159],[38.42335,27.13087],[38.42269,27.13048],[38.42209,27.13007],
  [38.42178,27.12967],[38.42158,27.12911],[38.42145,27.12872],[38.42084,27.12809],[38.42051,27.12765],
  [38.42027,27.12745],[38.41964,27.12701],[38.41919,27.12651],[38.41870,27.12636],[38.41842,27.12620],
  [38.41827,27.12583],[38.41794,27.12567],[38.41743,27.12475],[38.41752,27.12377],[38.41727,27.12334],
  [38.41706,27.12300],[38.41577,27.12286],[38.41554,27.12273],[38.41518,27.12240],[38.41446,27.12153],
  [38.41413,27.12121],[38.41386,27.12102],[38.41344,27.12086],[38.41279,27.12062],[38.41220,27.12033],
  [38.41156,27.11998],[38.41116,27.11955],[38.41094,27.11923],[38.41066,27.11869],[38.41050,27.11825],
  [38.41036,27.11760],[38.41022,27.11670],[38.41009,27.11560],[38.41003,27.11488],[38.40997,27.11389],
  [38.41003,27.11489],[38.41009,27.11561],[38.41022,27.11671],[38.41036,27.11761],[38.41050,27.11826],
  [38.41066,27.11870],[38.41094,27.11924],[38.41156,27.11999],[38.41220,27.12034],[38.41279,27.12063],
  [38.41386,27.12103],[38.41446,27.12154],[38.41518,27.12241],[38.41577,27.12287],[38.41706,27.12301],
  [38.41752,27.12378],[38.41794,27.12568],[38.41842,27.12621],[38.41870,27.12637],[38.41964,27.12702],
  [38.42027,27.12746],[38.42145,27.12873],[38.42209,27.13008],[38.42335,27.13088],[38.42611,27.13203],
  [38.42882,27.13351],[38.43078,27.13404],[38.43203,27.13576],[38.43443,27.13797],[38.43572,27.13907],
  [38.43683,27.14034],[38.43886,27.14129],[38.44170,27.14239],[38.44226,27.14341],
];

async function main() {
  console.log("=== 1. Fix names & delete old activities ===\n");

  const emreToken = await login("emre@demo.alsancak.run");
  console.log("Emre:");
  await fixNameAndDeleteActivities(emreToken, "Emre Y\u0131ld\u0131z");

  const ayseToken = await login("ayse@demo.alsancak.run");
  console.log("\nAyse:");
  await fixNameAndDeleteActivities(ayseToken, "Ay\u015fe Konak");

  const canToken = await login("can@demo.alsancak.run");
  console.log("\nCan:");
  await fixNameAndDeleteActivities(canToken, "Can Bostanc\u0131");

  console.log("\n=== 2. Create new activities with detailed GPS routes ===\n");

  const now = Date.now();
  const acts = [
    { token: emreToken, data: { title: "Kordon Sabah Ko\u015fusu", distanceM: 5200, movingTimeSec: 1560, startTime: new Date(now - 3*3600000).toISOString(), activityType: "Run", polylineEncoded: encode(KORDON), startLat: KORDON[0][0], startLng: KORDON[0][1], endLat: KORDON[KORDON.length-1][0], endLng: KORDON[KORDON.length-1][1], elevationGainM: 12 }},
    { token: emreToken, data: { title: "Sahilyolu Uzun Ko\u015fu", distanceM: 8500, movingTimeSec: 2550, startTime: new Date(now - 2*86400000 - 5*3600000).toISOString(), activityType: "Run", polylineEncoded: encode(SAHILYOLU), startLat: SAHILYOLU[0][0], startLng: SAHILYOLU[0][1], endLat: SAHILYOLU[SAHILYOLU.length-1][0], endLng: SAHILYOLU[SAHILYOLU.length-1][1], elevationGainM: 18 }},
    { token: ayseToken, data: { title: "K\u00fclt\u00fcrpark Ak\u015fam Turu", distanceM: 3100, movingTimeSec: 1085, startTime: new Date(now - 86400000 - 2*3600000).toISOString(), activityType: "Run", polylineEncoded: encode(KULTURPARK), startLat: KULTURPARK[0][0], startLng: KULTURPARK[0][1], endLat: KULTURPARK[KULTURPARK.length-1][0], endLng: KULTURPARK[KULTURPARK.length-1][1], elevationGainM: 8 }},
    { token: ayseToken, data: { title: "Kordon Tempo Ko\u015fusu", distanceM: 5200, movingTimeSec: 1430, startTime: new Date(now - 3*86400000 - 7*3600000).toISOString(), activityType: "Run", polylineEncoded: encode(KORDON), startLat: KORDON[0][0], startLng: KORDON[0][1], endLat: KORDON[KORDON.length-1][0], endLng: KORDON[KORDON.length-1][1], elevationGainM: 12 }},
    { token: canToken, data: { title: "Bornova Park Ko\u015fusu", distanceM: 2800, movingTimeSec: 980, startTime: new Date(now - 6*3600000).toISOString(), activityType: "Run", polylineEncoded: encode(BORNOVA), startLat: BORNOVA[0][0], startLng: BORNOVA[0][1], endLat: BORNOVA[BORNOVA.length-1][0], endLng: BORNOVA[BORNOVA.length-1][1], elevationGainM: 15 }},
    { token: canToken, data: { title: "G\u00f6ztepe Sahil Ko\u015fusu", distanceM: 4000, movingTimeSec: 1320, startTime: new Date(now - 4*86400000 - 8*3600000).toISOString(), activityType: "Run", polylineEncoded: encode(GOZTEPE), startLat: GOZTEPE[0][0], startLng: GOZTEPE[0][1], endLat: GOZTEPE[GOZTEPE.length-1][0], endLng: GOZTEPE[GOZTEPE.length-1][1], elevationGainM: 10 }},
    { token: emreToken, data: { title: "K\u00fclt\u00fcrpark Toparlanma", distanceM: 3100, movingTimeSec: 1116, startTime: new Date(now - 5*86400000 - 4*3600000).toISOString(), activityType: "Run", polylineEncoded: encode(KULTURPARK), startLat: KULTURPARK[0][0], startLng: KULTURPARK[0][1], endLat: KULTURPARK[KULTURPARK.length-1][0], endLng: KULTURPARK[KULTURPARK.length-1][1], elevationGainM: 8 }},
  ];

  for (const act of acts) {
    const res = await fetch(`${API}/api/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", Authorization: `Bearer ${act.token}` },
      body: JSON.stringify(act.data)
    });
    const body = await res.text();
    console.log(`  ${act.data.title}: ${res.status} ${body.substring(0, 80)}`);
  }

  console.log("\n=== 3. Verify ===\n");
  const verifyRes = await fetch(`${API}/api/community/activities?period=month&limit=10&_t=${Date.now()}`);
  const verify = await verifyRes.json();
  console.log(`Community activities: ${verify.total}`);
  for (const a of verify.activities) {
    console.log(`  ${a.memberName}: ${a.title} (polyline: ${a.polylineEncoded?.length} chars)`);
  }
}

main().catch(e => console.error("FAIL:", e));
