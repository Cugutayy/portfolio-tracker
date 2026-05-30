"use client";

import { motion } from "framer-motion";
import { PortfolioRing, type RingSlice } from "./PortfolioRing";

interface Leader {
  rank: number;
  name: string;
  handle: string;
  image?: string | null;
  returnPct: number;
  slices: RingSlice[];
}

// Demo veriler — gerçek API bağlanınca /api/leaderboard'dan beslenecek.
const DEMO: Leader[] = [
  {
    rank: 1,
    name: "Mert A.",
    handle: "mertcap",
    returnPct: 24.7,
    slices: [
      { label: "NVDA", weight: 0.4, color: "#76b900" },
      { label: "BTC", weight: 0.3, color: "#f7931a" },
      { label: "Altın", weight: 0.2, color: "#c8a064" },
      { label: "ETH", weight: 0.1, color: "#627eea" },
    ],
  },
  {
    rank: 2,
    name: "Defne K.",
    handle: "defnetrades",
    returnPct: 18.3,
    slices: [
      { label: "S&P", weight: 0.45, color: "#4f8ff7" },
      { label: "Altın", weight: 0.3, color: "#c8a064" },
      { label: "ASELS", weight: 0.25, color: "#e30613" },
    ],
  },
  {
    rank: 3,
    name: "Can Y.",
    handle: "canmacro",
    returnPct: 11.6,
    slices: [
      { label: "BTC", weight: 0.5, color: "#f7931a" },
      { label: "NASDAQ", weight: 0.3, color: "#a78bfa" },
      { label: "Gümüş", weight: 0.2, color: "#9ca3af" },
    ],
  },
  {
    rank: 4,
    name: "Elif S.",
    handle: "elifvalue",
    returnPct: -3.2,
    slices: [
      { label: "THYAO", weight: 0.4, color: "#e30613" },
      { label: "S&P", weight: 0.35, color: "#4f8ff7" },
      { label: "Altın", weight: 0.25, color: "#c8a064" },
    ],
  },
];

export function LeaderboardRail() {
  return (
    <div className="glass" style={{ padding: 22, width: "100%", maxWidth: 420 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: 14,
          borderBottom: "1px solid var(--rule, rgba(255,255,255,0.08))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="live-dot" />
          <span className="eyebrow">Canlı liderlik</span>
        </div>
        <span className="mono" style={{ fontSize: ".58rem", color: "var(--muted)" }}>
          tüm zamanlar
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {DEMO.map((l, i) => {
          const up = l.returnPct >= 0;
          return (
            <motion.div
              key={l.handle}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 0",
                borderBottom:
                  i < DEMO.length - 1
                    ? "1px solid var(--rule, rgba(255,255,255,0.05))"
                    : "none",
              }}
            >
              <span
                className="display"
                style={{
                  fontSize: "1.2rem",
                  width: 22,
                  color: l.rank === 1 ? "var(--accent)" : "var(--muted)",
                  textAlign: "center",
                }}
              >
                {l.rank}
              </span>

              <PortfolioRing slices={l.slices} image={l.image} size={48} strokeWidth={6} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: ".88rem",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {l.name}
                </div>
                <div className="mono" style={{ fontSize: ".6rem", color: "var(--muted)" }}>
                  @{l.handle}
                </div>
              </div>

              <div
                className="mono"
                style={{
                  fontSize: ".92rem",
                  fontWeight: 600,
                  color: up ? "var(--green-t, #4ade80)" : "var(--red-t, #f87171)",
                }}
              >
                {up ? "+" : ""}
                {l.returnPct.toFixed(1)}%
              </div>
            </motion.div>
          );
        })}
      </div>

      <div style={{ paddingTop: 12 }}>
        <span className="mono" style={{ fontSize: ".55rem", color: "var(--muted)", opacity: 0.6 }}>
          Örnek veri — yarışma açılınca gerçek portföyler listelenir.
        </span>
      </div>
    </div>
  );
}
