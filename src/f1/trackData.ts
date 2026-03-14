/**
 * Track coordinates for race circuits
 * Hand-crafted from official circuit layouts + satellite imagery
 * Format: [x, y] pairs — TrackSVG auto-scales and Y-flips
 */

export const TRACK_COORDS: Record<string, number[][]> = {
  // Shanghai International Circuit — 5.451 km, 16 turns
  // Iconic T1-T4 spiral ("上" character), 2 DRS zones
  // Track crosses itself at T1/T4 exit (bridge/flyover in real life)
  'Shanghai': [
    // ═══ S/F line (right side of main straight) ═══
    [450, 350],
    // ═══ MAIN STRAIGHT heading west — DRS Zone 1 ═══
    [390, 352], [330, 350], [270, 346], [210, 338], [150, 326], [100, 308], [60, 286],
    // ═══ T1 — Left turn entry into spiral (outer west side) ═══
    [28, 258], [10, 225], [5, 188], [10, 150], [25, 115],
    // ═══ T2 — Spiral bottom heading east ═══
    [48, 88], [80, 68], [120, 58], [162, 58], [200, 68],
    // ═══ T3 — Spiral east side heading north ═══
    [230, 88], [252, 115], [262, 150], [262, 190], [252, 228], [235, 260],
    // ═══ T4 — Inner spiral: heading west then south (tightening) ═══
    [210, 282], [178, 296], [142, 298], [108, 286], [82, 264],
    [68, 238], [62, 208], [68, 182], [85, 162], [108, 148],
    // ═══ T4 exit heading south — crosses T2 (bridge/flyover) ═══
    [118, 130], [122, 105], [120, 78],
    // ═══ T5–T6 continuing south ═══
    [114, 48], [104, 18], [90, -10],
    // ═══ T7 — Curving east toward back straight ═══
    [80, -35], [78, -58], [88, -80], [108, -98],
    // ═══ T8–T9 transition ═══
    [135, -112], [168, -120],
    // ═══ BACK STRAIGHT heading east — DRS Zone 2 ═══
    [208, -128], [258, -138], [318, -142], [370, -140],
    // ═══ T11 — Left turn heading north ═══
    [400, -128], [422, -108], [436, -80],
    // ═══ T12–T13 ═══
    [442, -48], [434, -15], [420, 14],
    // ═══ T14 — Hairpin ═══
    [402, 38], [388, 58], [380, 82], [382, 108],
    // ═══ T15–T16 heading north back to S/F ═══
    [390, 145], [400, 188], [412, 238], [428, 288], [442, 325], [450, 350],
  ],

  // Albert Park, Melbourne — 2026 Australian GP
  'Albert Park': [
    [-1324,-1211],[-1753,-803],[-2248,-332],[-2651,50],[-3172,543],[-3547,944],[-3655,1161],[-3648,1478],
    [-3556,2106],[-3674,2563],[-4087,3076],[-4557,3487],[-4920,3833],[-5262,4185],[-5722,4698],[-6084,5145],
    [-6465,5663],[-6739,6066],[-6939,6369],[-7122,6665],[-7196,6851],[-7200,7074],[-7130,7218],[-6958,7308],
    [-6808,7333],[-6466,7372],[-6151,7453],[-5927,7631],[-5813,7942],[-5828,8256],[-5873,8564],[-5944,9073],
    [-5862,9700],[-5590,10088],[-4982,10554],[-4590,10789],[-4018,11052],[-3515,11273],[-2964,11535],
    [-2495,11811],[-2107,11817],[-1740,11576],[-1299,11397],[-745,11285],[-269,11148],[302,10797],
    [688,10311],[937,9752],[1145,8813],[1168,8380],[1096,7508],[916,6935],[659,6170],[337,5378],
    [261,4641],[307,4110],[496,3336],[747,2779],[1163,2146],[1721,1582],[2121,1239],[2526,939],
    [2981,795],[3369,839],[3831,870],[4225,764],[4703,382],[5113,40],[5883,-632],[6226,-1037],
    [6488,-1475],[6713,-2006],[6986,-2796],[7197,-3451],[7347,-3924],[7444,-4354],[7492,-4603],
    [7494,-4831],[7370,-5009],[7101,-5106],[6863,-5173],[6603,-5241],[6234,-5327],[5872,-5422],
    [5526,-5517],[5087,-5554],[4811,-5434],[4598,-5230],[4359,-4860],[4163,-4460],[3985,-4081],
    [3781,-3762],[3596,-3634],[3407,-3665],[3268,-3782],[3139,-3972],[2999,-4184],[2710,-4394],
    [2355,-4458],[2035,-4371],[1570,-4016],[1314,-3768],[1041,-3500],[581,-3050],[252,-2727],
    [-200,-2284],[-625,-1876],[-1150,-1376],[-1686,-866],[-2187,-391],[-2682,79],[-3195,564],[-3390,755]
  ],
}

// Circuit name → session key mapping
export const CIRCUIT_MAP: Record<number, string> = {
  11234: 'Albert Park',  // 2026 Australian GP
  11245: 'Shanghai',     // 2026 Chinese GP Race
  11241: 'Shanghai',     // 2026 Chinese GP Qualifying
  11240: 'Shanghai',     // 2026 Chinese GP Sprint
}

// Circuit → total laps mapping
export const CIRCUIT_LAPS: Record<string, number> = {
  'Albert Park': 58,
  'Shanghai': 56,
  'Suzuka': 53,
  'Bahrain': 57,
  'Jeddah': 50,
  'Miami': 57,
  'Imola': 63,
  'Monaco': 78,
  'Barcelona': 66,
  'Montreal': 70,
  'Silverstone': 52,
  'Spielberg': 71,
  'Hungaroring': 70,
  'Spa': 44,
  'Zandvoort': 72,
  'Monza': 53,
  'Baku': 51,
  'Singapore': 62,
  'Austin': 56,
  'Mexico City': 71,
  'Interlagos': 71,
  'Las Vegas': 50,
  'Lusail': 57,
  'Yas Marina': 58,
}

/** Session key'den tur sayısını bul (default 58) */
export function getCircuitLaps(sessionKey: number): number {
  const name = CIRCUIT_MAP[sessionKey]
  if (name && CIRCUIT_LAPS[name]) return CIRCUIT_LAPS[name]
  return 58
}
