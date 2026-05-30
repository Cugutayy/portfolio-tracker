"use client";

import { useEffect, useState } from "react";
import { fmtAssetPrice } from "@/lib/format";
import type { AssetType } from "@/lib/assets";

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
  const [rows, setRows] = useState<LivePrice[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/prices");
        const j = await r.json();
        if (!alive || !j?.ok) return;
        const list = (Object.values(j.prices) as LivePrice[])
          .filter((p) => Number.isFinite(p.nativePrice))
          .sort((a, b) => a.ticker.localeCompare(b.ticker));
        setRows(list);
      } catch {
        /* keep last good tape */
      }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (rows.length === 0) {
    return (
      <div className="ticker">
        <div className="ticker-track" style={{ animation: "none" }}>
          <span className="ticker-item" style={{ color: "var(--muted)" }}>
            canlı fiyatlar yükleniyor…
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
          return (
            <span className="ticker-item" key={`${p.ticker}-${i}`}>
              <span style={{ fontWeight: 500, color: "var(--ink)" }}>
                {p.ticker}
              </span>{" "}
              <span style={{ color: "var(--ink-soft)" }}>
                {fmtAssetPrice(p.nativePrice, p.nativeCcy, p.type)}
              </span>{" "}
              {c == null ? (
                <span style={{ color: "var(--muted)" }}>—</span>
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
