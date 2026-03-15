"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useInView, useMotionValue } from "framer-motion";

// ── IZMIR BAY ACCURATE GEOGRAPHY ──────────────────────────────────
//
// Izmir Bay (Izmir Korfezi) is a large inlet of the Aegean Sea.
// It opens WEST toward the Aegean and narrows as it goes EAST, forming
// a funnel shape. The bay head is at Bayrakli where north and south
// shores nearly converge.
//
// SVG viewBox: 0 0 900 520
// West = left (open sea), East = right (bay head/Bayrakli)
// North = top, South = bottom
//
// SOUTH SHORE (W to E):
//   Guzelyali -> Goztepe -> Konak (Clock Tower) -> Pasaport -> Alsancak (Kordon)
//   Then curves NE toward Bayrakli
//
// NORTH SHORE (W to E):
//   Open sea -> Karsiyaka -> Bostanli -> curves SE toward Bayrakli
//
// INLAND:
//   Bornova (east of Bayrakli, inland)
//   Kadifekale (hill above Konak)
//   Kulturpark (between Alsancak & Basmane)
//   Agora (near Konak, ancient ruins)

// ── COASTLINE PATHS ──────────────────────────────────────────────

// South shore: gentle curve from west edge, dips south near Goztepe/Konak,
// then sweeps north toward Alsancak and converges at Bayrakli
const SOUTH_SHORE =
  "M 0 370 C 40 368, 80 365, 120 358 C 160 350, 200 338, 250 322 " +
  "C 300 306, 340 295, 390 286 C 440 278, 480 274, 520 272 " +
  "C 560 270, 600 270, 640 274 C 680 278, 710 286, 735 298";

// North shore: relatively straighter, gentle curve from NW down toward Bayrakli
const NORTH_SHORE =
  "M 0 185 C 60 183, 120 182, 180 184 C 240 186, 300 192, 360 200 " +
  "C 420 208, 470 218, 520 230 C 570 242, 610 254, 650 268 " +
  "C 680 276, 710 286, 735 298";

// Bay water: closed shape between the two shores
const BAY_WATER =
  // North shore (W to E)
  "M 0 185 C 60 183, 120 182, 180 184 C 240 186, 300 192, 360 200 " +
  "C 420 208, 470 218, 520 230 C 570 242, 610 254, 650 268 " +
  "C 680 276, 710 286, 735 298 " +
  // Bay head curve
  "C 740 302, 740 302, 735 298 " +
  // South shore (E to W)
  "C 710 286, 680 278, 640 274 C 600 270, 560 270, 520 272 " +
  "C 480 274, 440 278, 390 286 C 340 295, 300 306, 250 322 " +
  "C 200 338, 160 350, 120 358 C 80 365, 40 368, 0 370 Z";

// Subtle wave lines inside the bay for water texture
const WAVE_LINE_1 =
  "M 60 240 C 140 238, 240 245, 340 248 C 440 251, 530 255, 620 270";
const WAVE_LINE_2 =
  "M 80 280 C 160 276, 260 280, 360 268 C 460 256, 540 258, 640 278";
const WAVE_LINE_3 =
  "M 40 320 C 120 315, 220 308, 320 295 C 420 282, 500 272, 600 275";

// ── RUNNING ROUTES ───────────────────────────────────────────────

// Kordon Promenade: straight waterfront path along Alsancak
// Runs along the south shore between Cumhuriyet Meydani and Konak
// This is the most iconic running path in Izmir - relatively straight
const KORDON_ROUTE =
  "M 260 318 C 300 306, 340 296, 380 288 C 420 280, 460 276, 510 274";

// Kordon elevation data (nearly flat, 2-15m)
const KORDON_ELEVATION = [4, 3, 3, 2, 3, 4, 5, 4, 3, 2, 3, 4, 5, 6, 5, 4, 3, 4, 5, 4, 3, 4, 5, 6, 8, 10, 12, 10, 8, 6];

// Full bay circuit: Goztepe (south) -> Konak -> Alsancak -> Bayrakli -> Bostanli -> Karsiyaka (north)
const FULL_CIRCUIT =
  "M 155 348 C 200 334, 250 318, 300 306 C 350 294, 400 286, 450 278 " +
  "C 500 274, 540 272, 580 272 C 620 274, 660 280, 700 292 " +
  "C 720 298, 730 300, 735 298 " +
  "C 720 290, 700 280, 670 272 C 640 264, 600 256, 560 246 " +
  "C 520 236, 480 226, 440 218 C 400 210, 360 204, 320 198 " +
  "C 280 192, 240 190, 200 188";

// Full circuit elevation data (undulating, some hills near Bayrakli)
const CIRCUIT_ELEVATION = [8, 6, 5, 4, 3, 4, 6, 8, 5, 3, 4, 6, 10, 14, 18, 24, 30, 38, 42, 45, 40, 35, 28, 22, 18, 14, 10, 8, 6, 5];

// Kulturpark loop: rectangular park in central Izmir (between Alsancak & Basmane)
// Slightly inland from the coast
const KULTURPARK_ROUTE =
  "M 420 298 L 470 294 L 478 312 L 470 330 L 420 334 L 412 316 Z";

// Kulturpark elevation (flat park)
const KULTURPARK_ELEVATION = [8, 8, 7, 7, 8, 8, 7, 7, 8, 8, 9, 9, 8, 8, 7, 7, 8, 8, 7, 7, 8, 8, 9, 9, 8, 8, 7, 7, 8, 8];

// ── NEIGHBORHOODS & LANDMARKS ────────────────────────────────────

type LandmarkSide = "south" | "north" | "east" | "inland";
interface Landmark {
  x: number;
  y: number;
  label: string;
  sublabel?: string;
  side: LandmarkSide;
  isHome?: boolean;
  icon?: "clock" | "castle" | "ruins" | "park" | "ferry";
}

const LANDMARKS: Landmark[] = [
  // South shore (W to E)
  { x: 155, y: 348, label: "GÖZTEPE", side: "south" },
  { x: 270, y: 316, label: "KONAK", sublabel: "Saat Kulesi", side: "south", icon: "clock" },
  { x: 380, y: 288, label: "KORDON", side: "south" },
  { x: 510, y: 274, label: "ALSANCAK", side: "south", isHome: true },

  // Bay head
  { x: 700, y: 292, label: "BAYRAKLI", side: "east" },

  // North shore (E to W)
  { x: 520, y: 218, label: "BOSTANLI", side: "north" },
  { x: 320, y: 184, label: "KARŞIYAKA", side: "north", icon: "ferry" },

  // Inland
  { x: 750, y: 330, label: "BORNOVA", side: "inland" },
  { x: 310, y: 350, label: "KADİFEKALE", sublabel: "Kale", side: "inland", icon: "castle" },
  { x: 350, y: 308, label: "AGORA", side: "inland", icon: "ruins" },
  { x: 445, y: 306, label: "KÜLTÜRPARK", side: "inland", icon: "park" },
];

// ── ROUTE DEFINITIONS ────────────────────────────────────────────

interface RouteInfo {
  id: string;
  name: string;
  distance: string;
  elevation: string;
  pace: string;
  desc: string;
  path: string;
  elevationData: number[];
  accent: boolean;
}

const ROUTES: RouteInfo[] = [
  {
    id: "kordon",
    name: "KORDON TURU",
    distance: "7 KM",
    elevation: "12m",
    pace: "5:30 /km",
    desc: "Alsancak sahili boyunca klasik Kordon koşusu",
    path: KORDON_ROUTE,
    elevationData: KORDON_ELEVATION,
    accent: true,
  },
  {
    id: "korfez",
    name: "KÖRFEZİ TURU",
    distance: "18 KM",
    elevation: "45m",
    pace: "6:00 /km",
    desc: "Göztepe'den Karşıyaka'ya tam körfez turu",
    path: FULL_CIRCUIT,
    elevationData: CIRCUIT_ELEVATION,
    accent: false,
  },
  {
    id: "kulturpark",
    name: "KÜLTÜRPARK",
    distance: "5 KM",
    elevation: "8m",
    pace: "5:00 /km",
    desc: "Park içi parkur — düz ve hızlı tempo koşusu",
    path: KULTURPARK_ROUTE,
    elevationData: KULTURPARK_ELEVATION,
    accent: true,
  },
];

// ── HELPER: elevation profile SVG path ───────────────────────────

function buildElevationPath(
  data: number[],
  width: number,
  height: number,
  maxElev: number,
): { area: string; line: string } {
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => ({
    x: i * step,
    y: height - (v / maxElev) * (height * 0.8) - height * 0.1,
  }));

  let line = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cx1 = pts[i - 1].x + step * 0.4;
    const cy1 = pts[i - 1].y;
    const cx2 = pts[i].x - step * 0.4;
    const cy2 = pts[i].y;
    line += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pts[i].x} ${pts[i].y}`;
  }

  const area = line + ` L ${width} ${height} L 0 ${height} Z`;
  return { area, line };
}

// ── HELPER: distance markers along a route ───────────────────────

function getDistanceMarkers(routeId: string): Array<{ x: number; y: number; km: string }> {
  if (routeId === "kordon") {
    return [
      { x: 280, y: 314, km: "1" },
      { x: 340, y: 296, km: "3" },
      { x: 420, y: 280, km: "5" },
      { x: 495, y: 274, km: "7" },
    ];
  }
  if (routeId === "korfez") {
    return [
      { x: 210, y: 332, km: "2" },
      { x: 340, y: 296, km: "5" },
      { x: 520, y: 274, km: "8" },
      { x: 700, y: 292, km: "11" },
      { x: 520, y: 236, km: "14" },
      { x: 280, y: 194, km: "17" },
    ];
  }
  // kulturpark
  return [
    { x: 445, y: 296, km: "1" },
    { x: 476, y: 312, km: "2.5" },
    { x: 445, y: 330, km: "3.5" },
    { x: 414, y: 316, km: "5" },
  ];
}

// ── COMPONENT ────────────────────────────────────────────────────

export default function IzmirRunMap() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const [activeRoute, setActiveRoute] = useState<RouteInfo>(ROUTES[0]);
  const runnerProgress = useMotionValue(0);
  const offsetDistance = useTransform(runnerProgress, (v: number) => `${v * 100}%`);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const routeDrawProgress = useTransform(scrollYProgress, [0.12, 0.45], [0, 1]);

  // Animate runner dot — useMotionValue avoids 60 re-renders/sec
  useEffect(() => {
    if (!isInView) return;
    let raf: number;
    let start: number | null = null;
    const duration = 4000;
    const loop = (ts: number) => {
      if (!start) start = ts;
      const elapsed = (ts - start) % (duration + 1000);
      const progress = Math.min(elapsed / duration, 1);
      runnerProgress.set(progress);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isInView, activeRoute.id, runnerProgress]);

  const elevMax = Math.max(...activeRoute.elevationData) + 10;
  const elev = buildElevationPath(activeRoute.elevationData, 320, 50, elevMax);
  const markers = getDistanceMarkers(activeRoute.id);

  return (
    <section
      ref={sectionRef}
      className="relative py-32 md:py-48 bg-[#111] overflow-hidden"
    >
      <div className="max-w-[1600px] mx-auto px-[clamp(1.5rem,4vw,4rem)]">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-16">
          <div>
            <p className="label-text text-white/60 mb-4">OUR ROUTES</p>
            <h2 className="headline-lg">
              RUN THE<br />
              <span className="text-[#666]">COASTLINE</span>
            </h2>
          </div>
          <p className="body-text max-w-xs mt-4 md:mt-0 md:text-right">
            Her koşu İzmir Körfezi kıyısında. Güneyde Göztepe&#39;den kuzeyde Karşıyaka&#39;ya.
          </p>
        </div>

        {/* Map + sidebar grid */}
        <div className="grid lg:grid-cols-[1fr_340px] gap-8 max-w-6xl mx-auto">
          {/* ── MAP ── */}
          <div className="relative w-full aspect-[16/9] rounded-sm overflow-hidden bg-[#080808]">
            <svg
              viewBox="0 0 900 520"
              className="w-full h-full"
              fill="none"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Subtle grid */}
                <pattern id="izmGrid" width="45" height="45" patternUnits="userSpaceOnUse">
                  <path d="M 45 0 L 0 0 0 45" fill="none" stroke="#141414" strokeWidth="0.4" />
                </pattern>

                {/* Topographic contour */}
                <pattern id="topoLines" width="90" height="90" patternUnits="userSpaceOnUse">
                  <circle cx="45" cy="45" r="30" fill="none" stroke="#141414" strokeWidth="0.3" />
                  <circle cx="45" cy="45" r="60" fill="none" stroke="#121212" strokeWidth="0.2" />
                </pattern>

                {/* Bay water gradient */}
                <linearGradient id="bayWater" x1="0%" y1="30%" x2="100%" y2="80%">
                  <stop offset="0%" stopColor="#071828" stopOpacity="0.6" />
                  <stop offset="40%" stopColor="#0b2240" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#061420" stopOpacity="0.3" />
                </linearGradient>

                {/* Route glow */}
                <filter id="routeGlow2">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Runner glow */}
                <filter id="runnerGlow">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Subtle drop shadow for labels */}
                <filter id="labelShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.5" />
                </filter>
              </defs>

              {/* Background grid + topo */}
              <rect width="900" height="520" fill="url(#izmGrid)" />
              <rect width="900" height="520" fill="url(#topoLines)" opacity="0.4" />

              {/* Bay water fill */}
              <motion.path
                d={BAY_WATER}
                fill="url(#bayWater)"
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ duration: 2 }}
              />

              {/* Water texture: wave lines */}
              {[WAVE_LINE_1, WAVE_LINE_2, WAVE_LINE_3].map((w, i) => (
                <path
                  key={i}
                  d={w}
                  stroke="#0e2a4a"
                  strokeWidth="0.5"
                  opacity="0.3"
                  fill="none"
                  strokeDasharray="6 8"
                />
              ))}

              {/* Bay label */}
              <text
                x="330"
                y="268"
                fill="#0d2240"
                fontSize="13"
                fontFamily="monospace"
                letterSpacing="0.6em"
                fontWeight="700"
              >
                İZMİR KÖRFEZİ
              </text>

              {/* Coastlines */}
              <path d={SOUTH_SHORE} stroke="#1a3048" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
              <path d={NORTH_SHORE} stroke="#1a3048" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />

              {/* Land shading south of south shore */}
              <path
                d={SOUTH_SHORE + " L 900 400 L 900 520 L 0 520 L 0 370 Z"}
                fill="#0d0d0d"
                opacity="0.4"
              />
              {/* Land shading north of north shore */}
              <path
                d={NORTH_SHORE + " L 900 298 L 900 0 L 0 0 L 0 185 Z"}
                fill="#0d0d0d"
                opacity="0.4"
              />

              {/* ── INACTIVE ROUTES (dimmed) ── */}
              {ROUTES.filter((r) => r.id !== activeRoute.id).map((r) => (
                <path
                  key={r.id}
                  d={r.path}
                  stroke="#1a1a1a"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  strokeDasharray={r.id === "korfez" ? "4 6" : "none"}
                />
              ))}

              {/* ── ACTIVE ROUTE ── */}
              {/* Shadow underlay */}
              <path
                d={activeRoute.path}
                stroke={activeRoute.accent ? "#E6FF00" : "#ffffff"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity="0.08"
              />
              {/* Base track */}
              <path
                d={activeRoute.path}
                stroke="#333"
                strokeWidth={activeRoute.id === "korfez" ? 2 : 3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={activeRoute.id === "korfez" ? "4 6" : "none"}
              />
              {/* Animated draw */}
              <motion.path
                key={`route-${activeRoute.id}`}
                d={activeRoute.path}
                stroke={activeRoute.accent ? "#E6FF00" : "#ffffff"}
                strokeWidth={activeRoute.id === "korfez" ? 2 : 3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                filter="url(#routeGlow2)"
                opacity={activeRoute.id === "korfez" ? 0.6 : 1}
                strokeDasharray={activeRoute.id === "korfez" ? "4 6" : "none"}
                style={{ pathLength: routeDrawProgress }}
              />

              {/* ── DISTANCE MARKERS ── */}
              {markers.map((m, i) => (
                <motion.g
                  key={`km-${activeRoute.id}-${i}`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: 1.2 + i * 0.15 }}
                >
                  <circle
                    cx={m.x}
                    cy={m.y}
                    r="7"
                    fill="#111"
                    stroke={activeRoute.accent ? "#E6FF00" : "#ffffff"}
                    strokeWidth="1"
                    opacity="0.7"
                  />
                  <text
                    x={m.x}
                    y={m.y + 3}
                    fill={activeRoute.accent ? "#E6FF00" : "#ffffff"}
                    fontSize="6"
                    fontFamily="monospace"
                    textAnchor="middle"
                    fontWeight="600"
                    opacity="0.9"
                  >
                    {m.km}
                  </text>
                </motion.g>
              ))}

              {/* ── START MARKER ── */}
              <motion.g
                key={`start-${activeRoute.id}`}
                initial={{ opacity: 0, scale: 0 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
              >
                {/* Start position based on route */}
                {activeRoute.id === "kordon" && (
                  <>
                    <circle cx="260" cy="318" r="6" fill="#111" stroke="#E6FF00" strokeWidth="2" />
                    <text x="260" y="335" fill="#E6FF00" fontSize="7" fontFamily="monospace" textAnchor="middle" opacity="0.8">START</text>
                  </>
                )}
                {activeRoute.id === "korfez" && (
                  <>
                    <circle cx="155" cy="348" r="6" fill="#111" stroke="#ffffff" strokeWidth="2" />
                    <text x="155" y="365" fill="#ffffff" fontSize="7" fontFamily="monospace" textAnchor="middle" opacity="0.8">START</text>
                  </>
                )}
                {activeRoute.id === "kulturpark" && (
                  <>
                    <circle cx="420" cy="298" r="6" fill="#111" stroke="#E6FF00" strokeWidth="2" />
                    <text x="420" y="314" fill="#E6FF00" fontSize="7" fontFamily="monospace" textAnchor="middle" opacity="0.8">START</text>
                  </>
                )}
              </motion.g>

              {/* ── END MARKER ── */}
              <motion.g
                key={`end-${activeRoute.id}`}
                initial={{ opacity: 0, scale: 0 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.9, type: "spring", stiffness: 200 }}
              >
                {activeRoute.id === "kordon" && (
                  <>
                    <rect x="503" y="267" width="14" height="14" rx="2" fill="#E6FF00" />
                    <text x="510" y="278" fill="#111" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="800">F</text>
                  </>
                )}
                {activeRoute.id === "korfez" && (
                  <>
                    <rect x="193" y="181" width="14" height="14" rx="2" fill="#ffffff" />
                    <text x="200" y="192" fill="#111" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="800">F</text>
                  </>
                )}
                {activeRoute.id === "kulturpark" && (
                  <>
                    <rect x="405" y="296" width="14" height="14" rx="2" fill="#E6FF00" />
                    <text x="412" y="307" fill="#111" fontSize="7" fontFamily="monospace" textAnchor="middle" fontWeight="800">F</text>
                  </>
                )}
              </motion.g>

              {/* ── RUNNER DOT ── */}
              <motion.circle
                key={`runner-${activeRoute.id}`}
                r="5"
                fill={activeRoute.accent ? "#E6FF00" : "#ffffff"}
                filter="url(#runnerGlow)"
                style={{
                  offsetPath: `path("${activeRoute.path}")`,
                  offsetDistance,
                }}
              />
              {/* Runner pulse ring */}
              <motion.circle
                key={`runner-pulse-${activeRoute.id}`}
                r="5"
                fill="none"
                stroke={activeRoute.accent ? "#E6FF00" : "#ffffff"}
                strokeWidth="1"
                style={{
                  offsetPath: `path("${activeRoute.path}")`,
                  offsetDistance,
                }}
              >
                <animate attributeName="r" values="5;14;5" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0;0.6" dur="1.5s" repeatCount="indefinite" />
              </motion.circle>

              {/* ── LANDMARKS ── */}
              {LANDMARKS.map((lm, i) => {
                const labelY =
                  lm.side === "south"
                    ? lm.y + 18
                    : lm.side === "north"
                      ? lm.y - 12
                      : lm.side === "east"
                        ? lm.y - 12
                        : lm.y + 16;

                return (
                  <motion.g
                    key={lm.label}
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ delay: 0.6 + i * 0.08 }}
                  >
                    {/* Home base highlight for Alsancak */}
                    {lm.isHome && (
                      <>
                        <circle cx={lm.x} cy={lm.y} r="8" fill="none" stroke="#E6FF00" strokeWidth="1" opacity="0.3">
                          <animate attributeName="r" values="8;18;8" dur="2.5s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.3;0;0.3" dur="2.5s" repeatCount="indefinite" />
                        </circle>
                        <circle cx={lm.x} cy={lm.y} r="5" fill="#E6FF00" />
                        <text
                          x={lm.x}
                          y={lm.y - 14}
                          fill="#E6FF00"
                          fontSize="9"
                          fontFamily="monospace"
                          letterSpacing="0.12em"
                          textAnchor="middle"
                          fontWeight="700"
                          filter="url(#labelShadow)"
                        >
                          {lm.label}
                        </text>
                      </>
                    )}

                    {/* Regular landmarks */}
                    {!lm.isHome && (
                      <>
                        {/* Dot */}
                        <circle cx={lm.x} cy={lm.y} r="3" fill="#0B0B0B" stroke="#555" strokeWidth="1" />

                        {/* Icon indicators */}
                        {lm.icon === "clock" && (
                          <circle cx={lm.x} cy={lm.y} r="5" fill="none" stroke="#886633" strokeWidth="0.8" opacity="0.5" />
                        )}
                        {lm.icon === "castle" && (
                          <polygon points={`${lm.x - 4},${lm.y + 2} ${lm.x},${lm.y - 5} ${lm.x + 4},${lm.y + 2}`} fill="none" stroke="#886633" strokeWidth="0.8" opacity="0.5" />
                        )}
                        {lm.icon === "ruins" && (
                          <>
                            <line x1={lm.x - 3} y1={lm.y + 3} x2={lm.x - 3} y2={lm.y - 3} stroke="#886633" strokeWidth="0.8" opacity="0.4" />
                            <line x1={lm.x + 3} y1={lm.y + 3} x2={lm.x + 3} y2={lm.y - 3} stroke="#886633" strokeWidth="0.8" opacity="0.4" />
                            <line x1={lm.x - 5} y1={lm.y - 3} x2={lm.x + 5} y2={lm.y - 3} stroke="#886633" strokeWidth="0.8" opacity="0.4" />
                          </>
                        )}

                        {/* Label */}
                        <text
                          x={lm.x}
                          y={labelY}
                          fill="#555"
                          fontSize="7.5"
                          fontFamily="monospace"
                          letterSpacing="0.08em"
                          textAnchor="middle"
                          filter="url(#labelShadow)"
                        >
                          {lm.label}
                        </text>

                        {/* Sub-label */}
                        {lm.sublabel && (
                          <text
                            x={lm.x}
                            y={labelY + 10}
                            fill="#444"
                            fontSize="6"
                            fontFamily="monospace"
                            letterSpacing="0.05em"
                            textAnchor="middle"
                          >
                            {lm.sublabel}
                          </text>
                        )}
                      </>
                    )}
                  </motion.g>
                );
              })}

              {/* ── COMPASS ── */}
              <g transform="translate(840, 55)" opacity="0.3">
                <line x1="0" y1="-20" x2="0" y2="20" stroke="#555" strokeWidth="0.5" />
                <line x1="-20" y1="0" x2="20" y2="0" stroke="#555" strokeWidth="0.5" />
                <polygon points="0,-18 -3,-12 3,-12" fill="#E6FF00" opacity="0.7" />
                <text x="0" y="-24" fill="#888" fontSize="7" fontFamily="monospace" textAnchor="middle">N</text>
                <text x="0" y="30" fill="#555" fontSize="5" fontFamily="monospace" textAnchor="middle">S</text>
                <text x="26" y="3" fill="#555" fontSize="5" fontFamily="monospace" textAnchor="middle">E</text>
                <text x="-26" y="3" fill="#555" fontSize="5" fontFamily="monospace" textAnchor="middle">W</text>
              </g>

              {/* ── WEST LABEL (Aegean Sea) ── */}
              <text
                x="18"
                y="280"
                fill="#1a2a3a"
                fontSize="8"
                fontFamily="monospace"
                letterSpacing="0.25em"
                transform="rotate(-90, 18, 280)"
              >
                EGE DENIZI
              </text>

              {/* ── SCALE BAR ── */}
              <g transform="translate(40, 480)" opacity="0.3">
                <line x1="0" y1="0" x2="80" y2="0" stroke="#555" strokeWidth="1" />
                <line x1="0" y1="-3" x2="0" y2="3" stroke="#555" strokeWidth="1" />
                <line x1="80" y1="-3" x2="80" y2="3" stroke="#555" strokeWidth="1" />
                <text x="40" y="12" fill="#555" fontSize="6" fontFamily="monospace" textAnchor="middle">2 km</text>
              </g>
            </svg>

            {/* Route legend overlay */}
            <div className="absolute bottom-4 left-4 flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-[2px] bg-[#E6FF00]" />
                <span className="text-[9px] text-[#666] tracking-[0.15em]">KORDON (7 KM)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-[1px] border-t border-dashed border-white/30" />
                <span className="text-[9px] text-[#666] tracking-[0.15em]">KÖRFEZİ TURU (18 KM)</span>
              </div>
            </div>

            {/* Active route name overlay */}
            <div className="absolute top-4 left-4">
              <motion.div
                key={activeRoute.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <p className="text-[10px] tracking-[0.2em] text-[#555] font-mono">{activeRoute.name}</p>
                <p className="text-[9px] text-[#444] font-mono mt-0.5">{activeRoute.distance} &middot; {activeRoute.elevation} elev.</p>
              </motion.div>
            </div>
          </div>

          {/* ── SIDEBAR: route selector + elevation ── */}
          <div className="space-y-4">
            {ROUTES.map((route, i) => (
              <motion.button
                key={route.id}
                initial={{ opacity: 0, x: 20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.4 + i * 0.1 }}
                onClick={() => setActiveRoute(route)}
                className={`w-full text-left p-5 border transition-all duration-300 ${
                  activeRoute.id === route.id
                    ? route.accent
                      ? "border-[#E6FF00] bg-[#E6FF00]/5"
                      : "border-white/40 bg-white/5"
                    : "border-[#1a1a1a] hover:border-[#333]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold tracking-wider">{route.name}</span>
                  <span
                    className="text-lg font-bold"
                    style={{ color: route.accent ? "#E6FF00" : "#ffffff" }}
                  >
                    {route.distance}
                  </span>
                </div>
                <p className="text-[11px] text-[#666] mb-3">{route.desc}</p>
                <div className="flex gap-4 text-[10px] tracking-wider text-[#555]">
                  <span>ELEV. {route.elevation}</span>
                  <span>PACE {route.pace}</span>
                </div>
              </motion.button>
            ))}

            {/* ── ELEVATION PROFILE ── */}
            <motion.div
              key={`elev-${activeRoute.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.8 }}
              className="border border-[#1a1a1a] p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] tracking-[0.15em] text-[#555]">ELEVATION PROFILE</span>
                <span className="text-[10px] text-[#444] font-mono">
                  {Math.max(...activeRoute.elevationData)}m max
                </span>
              </div>
              <svg viewBox="0 0 320 50" className="w-full h-12" fill="none" preserveAspectRatio="none">
                {/* Grid lines */}
                {[0.25, 0.5, 0.75].map((pct) => (
                  <line
                    key={pct}
                    x1="0"
                    y1={50 * pct}
                    x2="320"
                    y2={50 * pct}
                    stroke="#1a1a1a"
                    strokeWidth="0.5"
                  />
                ))}
                {/* Area fill */}
                <path
                  d={elev.area}
                  fill={activeRoute.accent ? "#E6FF00" : "#ffffff"}
                  opacity="0.06"
                />
                {/* Line */}
                <path
                  d={elev.line}
                  stroke={activeRoute.accent ? "#E6FF00" : "#ffffff"}
                  strokeWidth="1.5"
                  opacity="0.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex justify-between mt-1">
                <span className="text-[8px] text-[#444] font-mono">0 km</span>
                <span className="text-[8px] text-[#444] font-mono">{activeRoute.distance}</span>
              </div>
            </motion.div>

            {/* Strava connect hint */}
            <div className="p-4 border border-dashed border-[#222] text-center">
              <p className="text-[10px] tracking-[0.15em] text-[#555]">
                STRAVA İLE SENKRONİZE ET
              </p>
              <p className="text-[10px] text-[#444] mt-1">
                Gerçek koşu verilerini görüntüle
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
