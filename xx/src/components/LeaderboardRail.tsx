"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

interface LeaderApiRow {
  name: string;
  handle: string;
  image: string | null;
  returnPct: number;
  totalTry: number;
  cashTry: number;
  slices: { ticker: string; color: string; weight: number; valueTry: number }[];
}

const gradFor = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const a = h % 360;
  return `linear-gradient(135deg, hsl(${a} 55% 45%), hsl(${(a + 60) % 360} 55% 30%))`;
};

// Fallback teaser — only shown before any real trader exists.
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

function toLeaders(rows: LeaderApiRow[]): Leader[] {
  return rows.slice(0, 4).map((r, i) => {
    const slices: RingSlice[] = r.slices
      .slice(0, 4)
      .map((s) => ({ label: s.ticker, weight: s.weight, color: s.color }));
    if (r.cashTry > 0 && r.totalTry > 0) {
      slices.push({
        label: "NAKİT",
        weight: r.cashTry / r.totalTry,
        color: "rgba(26,24,19,0.16)",
      });
    }
    return {
      rank: i + 1,
      name: r.name,
      handle: r.handle,
      image: r.image,
      returnPct: r.returnPct,
      slices,
    };
  });
}

export function LeaderboardRail() {
  const [leaders, setLeaders] = useState<Leader[] | null>(null);
  const [isReal, setIsReal] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/leaderboard", { cache: "no-store" });
        const j = await r.json();
        const rows: LeaderApiRow[] = j?.leaderboard ?? [];
        if (!alive) return;
        if (Array.isArray(rows) && rows.length > 0) {
          setLeaders(toLeaders(rows));
          setIsReal(true);
        } else {
          setLeaders(DEMO);
          setIsReal(false);
        }
      } catch {
        if (alive) {
          setLeaders(DEMO);
          setIsReal(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const list = leaders ?? DEMO;
  const loading = leaders === null;

  return (
    <div className="glass" style={{ padding: 22, width: "100%", maxWidth: 420 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: 14,
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="live-dot" />
          <span className="eyebrow">Canlı liderlik</span>
        </div>
        <span className="mono" style={{ fontSize: ".58rem", color: "var(--muted)" }}>
          en değerli
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", opacity: loading ? 0.55 : 1, transition: "opacity .3s" }}>
        {list.map((l, i) => {
          const up = l.returnPct >= 0;
          const row = (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 0",
                borderBottom: i < list.length - 1 ? "1px solid var(--rule)" : "none",
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

              <PortfolioRing
                slices={l.slices}
                image={l.image}
                initials={l.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                gradient={gradFor(l.handle)}
                size={48}
                strokeWidth={6}
              />

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
                  color: up ? "var(--green-t)" : "var(--red-t)",
                }}
              >
                {up ? "+" : ""}
                {l.returnPct.toFixed(1)}%
              </div>
            </motion.div>
          );

          // Real traders link to their public profile; demo rows are inert.
          return isReal ? (
            <Link key={l.handle} href={`/u/${l.handle}`} style={{ textDecoration: "none", color: "inherit" }}>
              {row}
            </Link>
          ) : (
            <div key={l.handle}>{row}</div>
          );
        })}
      </div>

      <div style={{ paddingTop: 12 }}>
        <span className="mono" style={{ fontSize: ".55rem", color: "var(--muted)", opacity: 0.6 }}>
          {isReal
            ? "Canlı portföyler — gerçek piyasa fiyatlarıyla değerlenir."
            : "Örnek veri — yarışma açılınca gerçek portföyler listelenir."}
        </span>
      </div>
    </div>
  );
}
