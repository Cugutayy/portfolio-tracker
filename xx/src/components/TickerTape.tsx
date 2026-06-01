"use client";

import { useEffect, useRef, useState } from "react";
import { fmtAssetPrice } from "@/lib/format";
import type { AssetType } from "@/lib/assets";
import { useT } from "./Providers";

interface LivePrice {
  ticker: string;
  name: string;
  type: AssetType;
  priceTry: number;
  nativePrice: number;
  nativeCcy: string;
  changePct: number | null;
}

/** Live ASCII price tape — broadsheet marquee fed by /api/prices. */
export function TickerTape() {
  const t = useT();
  const [rows, setRows] = useState<LivePrice[]>([]);
  // brief green/red flash on each ticker whose price moved since last refresh
  const [flash, setFlash] = useState<Record<string, "up" | "down">>({});
  const prevPrice = useRef<Record<string, number>>({});
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async (first: boolean) => {
      try {
        const r = await fetch("/api/prices");
        const j = await r.json();
        if (!alive || !j?.ok) return;
        const list = (Object.values(j.prices) as LivePrice[])
          .filter((p) => Number.isFinite(p.nativePrice))
          .sort((a, b) => a.ticker.localeCompare(b.ticker));

        // detect movers vs. the previous snapshot (skip the very first load)
        const moved: Record<string, "up" | "down"> = {};
        for (const p of list) {
          const before = prevPrice.current[p.ticker];
          if (!first && before != null && p.nativePrice !== before) {
            moved[p.ticker] = p.nativePrice > before ? "up" : "down";
          }
          prevPrice.current[p.ticker] = p.nativePrice;
        }
        setRows(list);
        if (Object.keys(moved).length) {
          setFlash(moved);
          if (flashTimer.current) clearTimeout(flashTimer.current);
          flashTimer.current = setTimeout(() => alive && setFlash({}), 1000);
        }
      } catch {
        /* keep last good tape */
      }
    };
    load(true);
    const id = setInterval(() => load(false), 60_000);
    return () => {
      alive = false;
      clearInterval(id);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  if (rows.length === 0) {
    return (
      <div className="ticker">
        <div className="ticker-track" style={{ animation: "none" }}>
          <span className="ticker-item" style={{ color: "var(--muted)" }}>
            {t.ticker_loading}
          </span>
        </div>
      </div>
    );
  }

  // duplicate the run so the -50% marquee loops seamlessly
  const run = [...rows, ...rows];

  return (
    <div className="ticker" aria-label="Canlı piyasa fiyatları">
      <div className="ticker-track">
        {run.map((p, i) => {
          const c = p.changePct;
          const up = (c ?? 0) >= 0;
          const f = flash[p.ticker];
          return (
            <span
              className="ticker-item"
              key={`${p.ticker}-${i}`}
              style={{
                background:
                  f === "up"
                    ? "rgba(26,122,74,0.14)"
                    : f === "down"
                      ? "rgba(194,59,43,0.14)"
                      : "transparent",
                transition: "background .9s ease",
              }}
            >
              <span style={{ fontWeight: 500, color: "var(--ink)" }}>
                {p.ticker}
              </span>{" "}
              <span style={{ color: "var(--ink-soft)" }}>
                {fmtAssetPrice(p.nativePrice, p.nativeCcy, p.type)}
              </span>{" "}
              {c == null ? (
                <span style={{ color: "var(--muted)" }}>·</span>
              ) : (
                <span className={up ? "pos" : "neg"}>
                  {up ? "▲" : "▼"}
                  {Math.abs(c).toFixed(2)}%
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
