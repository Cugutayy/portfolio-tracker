"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PulseRow {
  name: string;
  handle: string;
  returnPct: number;
  tradesCount: number;
}

/**
 * Slim broadsheet "pulse" ribbon under the ticker — live social proof:
 * how many traders are competing, today's leader, total trades. Falls back
 * to a graceful "arena just opened" line while the board is still empty.
 */
export function ArenaPulse() {
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

  if (rows === null) return null; // stay quiet until we know the real state

  const count = rows.length;
  const trades = rows.reduce((s, r) => s + (r.tradesCount || 0), 0);
  const leader = count
    ? [...rows].sort((a, b) => b.returnPct - a.returnPct)[0]
    : null;

  return (
    <div style={{ borderBottom: "1px solid var(--rule)", background: "var(--paper)" }}>
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "8px 24px",
          display: "flex",
          alignItems: "center",
          gap: 18,
          flexWrap: "wrap",
        }}
      >
        {count === 0 ? (
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
            ARENA BUGÜN AÇILDI · İLK PORTFÖYÜ SEN KUR →
          </Link>
        ) : (
          <>
            <Item>
              <span className="live-dot" />
              <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{count}</strong>
              &nbsp;TRADER YARIŞIYOR
            </Item>
            {leader && (
              <Item>
                GÜNÜN LİDERİ&nbsp;
                <Link
                  href={`/u/${leader.handle}`}
                  style={{ color: "var(--ink)", textDecoration: "none", fontWeight: 600 }}
                >
                  @{leader.handle}
                </Link>
                &nbsp;
                <span
                  className={leader.returnPct >= 0 ? "pos" : "neg"}
                  style={{ fontWeight: 600 }}
                >
                  {leader.returnPct >= 0 ? "▲" : "▼"}
                  {Math.abs(leader.returnPct).toFixed(1)}%
                </span>
              </Item>
            )}
            <Item>
              <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{trades}</strong>
              &nbsp;İŞLEM
            </Item>
          </>
        )}
      </div>
    </div>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: ".62rem",
        letterSpacing: ".1em",
        color: "var(--muted)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
