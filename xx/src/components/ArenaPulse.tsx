"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "./Providers";

interface PulseRow {
  name: string;
  handle: string;
  returnPct: number;
}

/**
 * Slim live standings ticker under the price tape — scrolls the ranked
 * traders (top gainers first), slower than the price marquee. Falls back to
 * an "arena just opened" CTA while the board is empty.
 */
export function ArenaPulse() {
  const t = useT();
  const [rows, setRows] = useState<PulseRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/leaderboard", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (alive) setRows(Array.isArray(j?.leaderboard) ? j.leaderboard : []);
      })
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, []);

  if (rows === null) return null;

  if (rows.length === 0) {
    return (
      <div style={{ borderBottom: "1px solid var(--rule)", background: "var(--paper)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "8px 24px", display: "flex", justifyContent: "center" }}>
          <Link
            href="/join"
            className="mono"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: ".62rem",
              letterSpacing: ".12em",
              color: "var(--muted)",
              textDecoration: "none",
            }}
          >
            <span className="live-dot" />
            {t.pulse_opened}
          </Link>
        </div>
      </div>
    );
  }

  const ranked = [...rows]
    .sort((a, b) => b.returnPct - a.returnPct)
    .map((r, i) => ({ ...r, rank: i + 1 }));
  // duplicate so the -50% marquee loops seamlessly
  const run = [...ranked, ...ranked];

  return (
    <div className="ticker" aria-label="Canlı sıralama">
      <div className="ticker-track" style={{ animation: "marquee 80s linear infinite" }}>
        {run.map((r, i) => {
          const up = r.returnPct >= 0;
          return (
            <Link
              key={`${r.handle}-${i}`}
              href={`/u/${r.handle}`}
              className="ticker-item"
              style={{ textDecoration: "none" }}
            >
              <span style={{ color: "var(--muted)" }}>{r.rank}.</span>{" "}
              <span style={{ fontWeight: 500, color: "var(--ink)" }}>@{r.handle}</span>{" "}
              <span className={up ? "pos" : "neg"}>
                {up ? "▲" : "▼"}
                {Math.abs(r.returnPct).toFixed(1)}%
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
