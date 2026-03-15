"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView, useMotionValue, useTransform } from "framer-motion";

// ── IZMIR BAY GEOGRAPHY ──────────────────────────────────────────
//
// This is the Route Explorer map used on the /runs page.
// It uses the same geographically accurate Izmir Bay base map
// as IzmirRunMap but with interactive route selection.
//
// SVG viewBox: 0 0 800 500
// West = left (open Aegean), East = right (bay head / Bayrakli)

// Coastlines
const SOUTH_SHORE =
  "M 0 340 C 40 338, 80 332, 120 324 C 160 316, 200 304, 240 292 " +
  "C 280 280, 320 270, 360 262 C 400 254, 440 250, 480 248 " +
  "C 520 246, 560 248, 600 254 C 640 260, 670 270, 690 282";

const NORTH_SHORE =
  "M 0 175 C 50 174, 100 173, 160 174 C 220 176, 280 182, 340 190 " +
  "C 400 198, 450 210, 500 222 C 540 232, 580 244, 620 258 " +
  "C 650 268, 675 276, 690 282";

const BAY_WATER =
  // North shore (W to E)
  "M 0 175 C 50 174, 100 173, 160 174 C 220 176, 280 182, 340 190 " +
  "C 400 198, 450 210, 500 222 C 540 232, 580 244, 620 258 " +
  "C 650 268, 675 276, 690 282 " +
  // South shore reversed (E to W)
  "C 670 270, 640 260, 600 254 C 560 248, 520 246, 480 248 " +
  "C 440 250, 400 254, 360 262 C 320 270, 280 280, 240 292 " +
  "C 200 304, 160 316, 120 324 C 80 332, 40 338, 0 340 Z";

// Wave texture lines
const WAVE_1 = "M 50 220 C 150 218, 280 225, 380 230 C 480 235, 560 245, 640 265";
const WAVE_2 = "M 60 260 C 160 256, 280 260, 380 250 C 480 240, 560 242, 640 270";
const WAVE_3 = "M 30 300 C 130 295, 230 288, 330 276 C 430 264, 520 254, 620 260";

// ── ROUTES ───────────────────────────────────────────────────────

interface Route {
  id: string;
  name: string;
  distance: string;
  elevation: string;
  pace: string;
  description: string;
  path: string;
  color: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  elevationData: number[];
  kmMarkers: Array<{ x: number; y: number; km: string }>;
}

const routes: Route[] = [
  {
    id: "kordon",
    name: "KORDON TURU",
    distance: "7 KM",
    elevation: "12m",
    pace: "5:30 /km",
    description: "Alsancak sahili boyunca klasik Kordon koşusu",
    // Kordon waterfront: mostly straight path along south shore
    path: "M 240 290 C 280 278, 320 268, 360 262 C 400 256, 440 252, 480 250",
    color: "#E6FF00",
    startX: 240,
    startY: 290,
    endX: 480,
    endY: 250,
    elevationData: [4, 3, 3, 2, 3, 5, 6, 5, 4, 3, 2, 3, 5, 6, 8, 10, 12, 10, 8, 6, 5, 4, 3, 4, 5, 4, 3, 4, 5, 4],
    kmMarkers: [
      { x: 270, y: 284, km: "1" },
      { x: 330, y: 268, km: "3" },
      { x: 410, y: 254, km: "5" },
      { x: 470, y: 250, km: "7" },
    ],
  },
  {
    id: "korfez",
    name: "KÖRFEZİ TURU",
    distance: "18 KM",
    elevation: "45m",
    pace: "6:00 /km",
    description: "Göztepe\u2019den Karşıyaka\u2019ya tam körfez turu",
    // Full bay circuit following both coastlines
    path: "M 140 322 C 180 308, 230 292, 280 278 C 330 266, 380 256, 430 252 " +
      "C 480 248, 530 248, 580 252 C 620 258, 660 268, 685 280 " +
      "C 675 274, 650 264, 620 256 C 580 244, 540 234, 500 224 " +
      "C 460 214, 420 206, 380 198 C 340 190, 290 184, 240 180 " +
      "C 200 178, 170 178, 150 180",
    color: "#FFFFFF",
    startX: 140,
    startY: 322,
    endX: 150,
    endY: 180,
    elevationData: [8, 6, 5, 4, 3, 4, 6, 8, 5, 3, 4, 6, 10, 16, 22, 30, 38, 45, 42, 38, 30, 22, 16, 12, 10, 8, 6, 5, 4, 5],
    kmMarkers: [
      { x: 200, y: 302, km: "2" },
      { x: 330, y: 266, km: "5" },
      { x: 500, y: 248, km: "8" },
      { x: 650, y: 266, km: "11" },
      { x: 500, y: 224, km: "14" },
      { x: 280, y: 184, km: "17" },
    ],
  },
  {
    id: "kulturpark",
    name: "KÜLTÜRPARK",
    distance: "5 KM",
    elevation: "8m",
    pace: "5:00 /km",
    description: "Kültürpark içi parkur, düz ve hızlı",
    // Rectangular park loop, ON LAND south of south shore (y > 260 at this x range)
    path: "M 390 272 L 435 268 L 440 290 L 435 310 L 390 314 L 385 290 Z",
    color: "#E6FF00",
    startX: 390,
    startY: 272,
    endX: 390,
    endY: 272,
    elevationData: [8, 8, 7, 7, 8, 9, 9, 8, 7, 7, 8, 8, 9, 9, 8, 7, 7, 8, 8, 9, 9, 8, 7, 7, 8, 8, 9, 9, 8, 8],
    kmMarkers: [
      { x: 420, y: 270, km: "1" },
      { x: 440, y: 290, km: "2" },
      { x: 420, y: 310, km: "3" },
      { x: 385, y: 290, km: "4" },
    ],
  },
];

// ── LANDMARKS ────────────────────────────────────────────────────

interface MapLandmark {
  x: number;
  y: number;
  label: string;
  side: "south" | "north" | "east" | "inland";
  icon?: "clock" | "castle" | "ruins" | "park";
}

const landmarks: MapLandmark[] = [
  { x: 140, y: 330, label: "GÖZTEPE", side: "south" },
  { x: 260, y: 292, label: "KONAK", side: "south", icon: "clock" },
  { x: 370, y: 268, label: "KORDON", side: "south" },
  { x: 490, y: 256, label: "ALSANCAK", side: "south" },
  { x: 580, y: 245, label: "BAYRAKLI", side: "north" },
  { x: 430, y: 216, label: "BOSTANLI", side: "north" },
  { x: 290, y: 186, label: "KARŞIYAKA", side: "north" },
  { x: 300, y: 330, label: "KADİFEKALE", side: "inland", icon: "castle" },
  { x: 330, y: 290, label: "AGORA", side: "inland", icon: "ruins" },
  { x: 412, y: 290, label: "KÜLTÜRPARK", side: "inland", icon: "park" },
];

// ── ELEVATION HELPER ─────────────────────────────────────────────

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

// ── COMPONENT ────────────────────────────────────────────────────

export default function RunningRouteMap() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const [activeRoute, setActiveRoute] = useState(routes[0]);
  const runnerProgress = useMotionValue(0);
  const offsetDistance = useTransform(runnerProgress, (v: number) => `${v * 100}%`);

  // Animate runner dot — useMotionValue avoids 60 re-renders/sec
  useEffect(() => {
    if (!isInView) return;
    let raf: number;
    let start: number | null = null;
    const duration = 3500;
    const pause = 1200;
    const loop = (ts: number) => {
      if (!start) start = ts;
      const elapsed = (ts - start) % (duration + pause);
      const progress = Math.min(elapsed / duration, 1);
      runnerProgress.set(progress);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isInView, activeRoute.id, runnerProgress]);

  const elevMax = Math.max(...activeRoute.elevationData) + 10;
  const elev = buildElevationPath(activeRoute.elevationData, 360, 55, elevMax);

  return (
    <section
      ref={sectionRef}
      className="relative py-32 md:py-48 bg-[#111]"
    >
      <div className="max-w-[1600px] mx-auto px-[clamp(1.5rem,4vw,4rem)]">
        {/* Header */}
        <div className="mb-16">
          <p className="label-text text-white/60 mb-4">ROUTE EXPLORER</p>
          <h2 className="headline-lg">
            YOUR<br />
            <span className="text-[#666]">ROUTES</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-[1fr_400px] gap-12">
          {/* ── MAP ── */}
          <div className="relative aspect-[16/10] bg-[#080808] rounded-sm overflow-hidden">
            <svg viewBox="0 0 800 500" className="w-full h-full" fill="none" preserveAspectRatio="xMidYMid meet">
              <defs>
                {/* Grid */}
                <pattern id="routeGrid" width="35" height="35" patternUnits="userSpaceOnUse">
                  <path d="M 35 0 L 0 0 0 35" fill="none" stroke="#141414" strokeWidth="0.4" />
                </pattern>

                {/* Topo contours */}
                <pattern id="routeTopo" width="80" height="80" patternUnits="userSpaceOnUse">
                  <circle cx="40" cy="40" r="28" fill="none" stroke="#131313" strokeWidth="0.25" />
                  <circle cx="40" cy="40" r="55" fill="none" stroke="#121212" strokeWidth="0.2" />
                </pattern>

                {/* Water gradient */}
                <linearGradient id="routeWater" x1="0%" y1="20%" x2="100%" y2="80%">
                  <stop offset="0%" stopColor="#071828" stopOpacity="0.55" />
                  <stop offset="50%" stopColor="#0b2240" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#061420" stopOpacity="0.3" />
                </linearGradient>

                {/* Glow filter */}
                <filter id="activeGlow">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Runner glow */}
                <filter id="dotGlow">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Label shadow */}
                <filter id="lblShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.6" />
                </filter>
              </defs>

              {/* Background layers */}
              <rect width="800" height="500" fill="url(#routeGrid)" />
              <rect width="800" height="500" fill="url(#routeTopo)" opacity="0.4" />

              {/* Bay water */}
              <motion.path
                d={BAY_WATER}
                fill="url(#routeWater)"
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ duration: 1.5 }}
              />

              {/* Wave texture */}
              {[WAVE_1, WAVE_2, WAVE_3].map((w, i) => (
                <path
                  key={i}
                  d={w}
                  stroke="#0e2a4a"
                  strokeWidth="0.5"
                  opacity="0.25"
                  fill="none"
                  strokeDasharray="5 7"
                />
              ))}

              {/* Bay label */}
              <text
                x="310"
                y="250"
                fill="#0d2240"
                fontSize="11"
                fontFamily="monospace"
                letterSpacing="0.5em"
                fontWeight="700"
              >
                İZMİR KÖRFEZİ
              </text>

              {/* Coastlines */}
              <path d={SOUTH_SHORE} stroke="#1a3048" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
              <path d={NORTH_SHORE} stroke="#1a3048" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />

              {/* Land shading */}
              <path
                d={SOUTH_SHORE + " L 800 380 L 800 500 L 0 500 L 0 340 Z"}
                fill="#0d0d0d"
                opacity="0.35"
              />
              <path
                d={NORTH_SHORE + " L 800 282 L 800 0 L 0 0 L 0 175 Z"}
                fill="#0d0d0d"
                opacity="0.35"
              />

              {/* ── INACTIVE ROUTES ── */}
              {routes
                .filter((r) => r.id !== activeRoute.id)
                .map((route) => (
                  <path
                    key={route.id}
                    d={route.path}
                    stroke="#1a1a1a"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    strokeDasharray={route.id === "korfez" ? "4 6" : "none"}
                  />
                ))}

              {/* ── ACTIVE ROUTE ── */}
              {/* Soft glow underlay */}
              <path
                d={activeRoute.path}
                stroke={activeRoute.color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity="0.06"
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
              {/* Animated active path */}
              <motion.path
                key={activeRoute.id}
                d={activeRoute.path}
                stroke={activeRoute.color}
                strokeWidth={activeRoute.id === "korfez" ? 2 : 3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                filter="url(#activeGlow)"
                opacity={activeRoute.id === "korfez" ? 0.5 : 1}
                strokeDasharray={activeRoute.id === "korfez" ? "4 6" : "none"}
                initial={{ pathLength: 0 }}
                animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
                transition={{ duration: 1.8, ease: [0.76, 0, 0.24, 1] }}
              />

              {/* ── DISTANCE MARKERS ── */}
              {activeRoute.kmMarkers.map((m, i) => (
                <motion.g
                  key={`km-${activeRoute.id}-${i}`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: 1 + i * 0.12 }}
                >
                  <circle
                    cx={m.x}
                    cy={m.y}
                    r="7"
                    fill="#111"
                    stroke={activeRoute.color}
                    strokeWidth="1"
                    opacity="0.7"
                  />
                  <text
                    x={m.x}
                    y={m.y + 3}
                    fill={activeRoute.color}
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
                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
              >
                <circle
                  cx={activeRoute.startX}
                  cy={activeRoute.startY}
                  r="6"
                  fill="#111"
                  stroke={activeRoute.color}
                  strokeWidth="2"
                />
                <text
                  x={activeRoute.startX}
                  y={activeRoute.startY + 18}
                  fill={activeRoute.color}
                  fontSize="7"
                  fontFamily="monospace"
                  textAnchor="middle"
                  opacity="0.8"
                >
                  START
                </text>
              </motion.g>

              {/* ── END MARKER ── */}
              {activeRoute.id !== "kulturpark" && (
                <motion.g
                  key={`end-${activeRoute.id}`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
                >
                  <rect
                    x={activeRoute.endX - 7}
                    y={activeRoute.endY - 7}
                    width="14"
                    height="14"
                    rx="2"
                    fill={activeRoute.color}
                  />
                  <text
                    x={activeRoute.endX}
                    y={activeRoute.endY + 4}
                    fill="#111"
                    fontSize="8"
                    fontFamily="monospace"
                    textAnchor="middle"
                    fontWeight="800"
                  >
                    F
                  </text>
                </motion.g>
              )}

              {/* ── RUNNER DOT ── */}
              <motion.circle
                key={`runner-${activeRoute.id}`}
                r="5"
                fill={activeRoute.color}
                filter="url(#dotGlow)"
                style={{
                  offsetPath: `path("${activeRoute.path}")`,
                  offsetDistance,
                }}
              />
              <motion.circle
                key={`runner-pulse-${activeRoute.id}`}
                r="5"
                fill="none"
                stroke={activeRoute.color}
                strokeWidth="1"
                style={{
                  offsetPath: `path("${activeRoute.path}")`,
                  offsetDistance,
                }}
              >
                <animate attributeName="r" values="5;14;5" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0;0.5" dur="1.5s" repeatCount="indefinite" />
              </motion.circle>

              {/* ── LANDMARKS ── */}
              {landmarks.map((lm, i) => {
                const isAlsancak = lm.label === "ALSANCAK";
                const labelY =
                  lm.side === "south"
                    ? lm.y + 16
                    : lm.side === "north"
                      ? lm.y - 10
                      : lm.side === "east"
                        ? lm.y - 10
                        : lm.y + 14;

                return (
                  <motion.g
                    key={lm.label}
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ delay: 0.5 + i * 0.07 }}
                  >
                    {isAlsancak ? (
                      <>
                        <circle cx={lm.x} cy={lm.y} r="8" fill="none" stroke="#E6FF00" strokeWidth="1" opacity="0.3">
                          <animate attributeName="r" values="8;16;8" dur="2.5s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.3;0;0.3" dur="2.5s" repeatCount="indefinite" />
                        </circle>
                        <circle cx={lm.x} cy={lm.y} r="5" fill="#E6FF00" />
                        <text
                          x={lm.x}
                          y={lm.y - 14}
                          fill="#E6FF00"
                          fontSize="9"
                          fontFamily="monospace"
                          letterSpacing="0.1em"
                          textAnchor="middle"
                          fontWeight="700"
                          filter="url(#lblShadow)"
                        >
                          ALSANCAK
                        </text>
                      </>
                    ) : (
                      <>
                        <circle cx={lm.x} cy={lm.y} r="2.5" fill="#0B0B0B" stroke="#555" strokeWidth="0.8" />

                        {/* Icon accents */}
                        {lm.icon === "clock" && (
                          <circle cx={lm.x} cy={lm.y} r="5" fill="none" stroke="#886633" strokeWidth="0.6" opacity="0.4" />
                        )}
                        {lm.icon === "castle" && (
                          <polygon
                            points={`${lm.x - 4},${lm.y + 2} ${lm.x},${lm.y - 5} ${lm.x + 4},${lm.y + 2}`}
                            fill="none"
                            stroke="#886633"
                            strokeWidth="0.6"
                            opacity="0.4"
                          />
                        )}
                        {lm.icon === "ruins" && (
                          <>
                            <line x1={lm.x - 3} y1={lm.y + 3} x2={lm.x - 3} y2={lm.y - 3} stroke="#886633" strokeWidth="0.6" opacity="0.3" />
                            <line x1={lm.x + 3} y1={lm.y + 3} x2={lm.x + 3} y2={lm.y - 3} stroke="#886633" strokeWidth="0.6" opacity="0.3" />
                            <line x1={lm.x - 5} y1={lm.y - 3} x2={lm.x + 5} y2={lm.y - 3} stroke="#886633" strokeWidth="0.6" opacity="0.3" />
                          </>
                        )}

                        <text
                          x={lm.x}
                          y={labelY}
                          fill="#555"
                          fontSize="7"
                          fontFamily="monospace"
                          letterSpacing="0.08em"
                          textAnchor="middle"
                          filter="url(#lblShadow)"
                        >
                          {lm.label}
                        </text>
                      </>
                    )}
                  </motion.g>
                );
              })}

              {/* ── COMPASS ── */}
              <g transform="translate(750, 50)" opacity="0.25">
                <line x1="0" y1="-18" x2="0" y2="18" stroke="#555" strokeWidth="0.5" />
                <line x1="-18" y1="0" x2="18" y2="0" stroke="#555" strokeWidth="0.5" />
                <polygon points="0,-16 -2.5,-11 2.5,-11" fill="#E6FF00" opacity="0.7" />
                <text x="0" y="-22" fill="#888" fontSize="7" fontFamily="monospace" textAnchor="middle">N</text>
              </g>

              {/* ── AEGEAN LABEL ── */}
              <text
                x="15"
                y="260"
                fill="#1a2a3a"
                fontSize="7"
                fontFamily="monospace"
                letterSpacing="0.2em"
                transform="rotate(-90, 15, 260)"
              >
                EGE DENIZI
              </text>

              {/* ── SCALE BAR ── */}
              <g transform="translate(35, 465)" opacity="0.25">
                <line x1="0" y1="0" x2="70" y2="0" stroke="#555" strokeWidth="1" />
                <line x1="0" y1="-3" x2="0" y2="3" stroke="#555" strokeWidth="1" />
                <line x1="70" y1="-3" x2="70" y2="3" stroke="#555" strokeWidth="1" />
                <text x="35" y="12" fill="#555" fontSize="6" fontFamily="monospace" textAnchor="middle">2 km</text>
              </g>
            </svg>

            {/* Route name overlay */}
            <div className="absolute top-4 left-4">
              <motion.div
                key={activeRoute.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                <p className="text-[10px] tracking-[0.2em] font-mono" style={{ color: activeRoute.color === "#FFFFFF" ? "#999" : "#666" }}>
                  {activeRoute.name}
                </p>
                <p className="text-[9px] text-[#444] font-mono mt-0.5">{activeRoute.distance} &middot; {activeRoute.elevation} elev.</p>
              </motion.div>
            </div>
          </div>

          {/* ── ROUTE SELECTOR + ELEVATION ── */}
          <div className="space-y-4">
            {routes.map((route, i) => (
              <motion.button
                key={route.id}
                initial={{ opacity: 0, x: 20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.3 + i * 0.1 }}
                onClick={() => setActiveRoute(route)}
                className={`w-full text-left p-6 border transition-all duration-300 ${
                  activeRoute.id === route.id
                    ? route.color === "#FFFFFF"
                      ? "border-white/40 bg-white/5"
                      : "border-[#E6FF00] bg-[#E6FF00]/5"
                    : "border-[#222] hover:border-[#444]"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold tracking-wider">{route.name}</span>
                  <span
                    className="text-lg font-bold"
                    style={{ color: route.color }}
                  >
                    {route.distance}
                  </span>
                </div>
                <p className="text-xs text-[#666] mb-3">{route.description}</p>
                <div className="flex gap-6 text-[10px] tracking-wider text-[#555]">
                  <span>ELEVATION {route.elevation}</span>
                  <span>PACE {route.pace}</span>
                </div>
              </motion.button>
            ))}

            {/* ── ELEVATION PROFILE ── */}
            <motion.div
              key={`elev-${activeRoute.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.7 }}
              className="border border-[#1a1a1a] p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] tracking-[0.15em] text-[#555]">ELEVATION PROFILE</span>
                <span className="text-[10px] text-[#444] font-mono">
                  {Math.max(...activeRoute.elevationData)}m max
                </span>
              </div>
              <svg viewBox="0 0 360 55" className="w-full h-12" fill="none" preserveAspectRatio="none">
                {/* Horizontal grid */}
                {[0.25, 0.5, 0.75].map((pct) => (
                  <line
                    key={pct}
                    x1="0"
                    y1={55 * pct}
                    x2="360"
                    y2={55 * pct}
                    stroke="#1a1a1a"
                    strokeWidth="0.5"
                  />
                ))}
                {/* Area */}
                <path
                  d={elev.area}
                  fill={activeRoute.color}
                  opacity="0.06"
                />
                {/* Line */}
                <path
                  d={elev.line}
                  stroke={activeRoute.color}
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
            <div className="mt-4 p-4 border border-dashed border-[#333] text-center">
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
