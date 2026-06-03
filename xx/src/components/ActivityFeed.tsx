"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { fmtMoney } from "@/lib/currency";
import { useT, useCurrency } from "@/components/Providers";

interface FeedEvent {
  kind: "buy" | "sell" | "open" | "close";
  userName: string;
  userHandle: string;
  userImage: string | null;
  ticker: string;
  name: string;
  side?: "long" | "short";
  leverage?: number;
  amountTry?: number;
  pnlTry?: number | null;
  liquidated?: boolean;
  at: string;
}

const grad = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const a = h % 360;
  return `linear-gradient(135deg, hsl(${a} 55% 45%), hsl(${(a + 60) % 360} 55% 30%))`;
};
const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export function ActivityFeed() {
  const t = useT();
  const cur = useCurrency();
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [usdTry, setUsdTry] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/feed", { cache: "no-store" });
        const j = await r.json();
        if (alive && j.ok) {
          setEvents(j.events);
          setUsdTry(j.usdTry ?? 0);
        }
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const money = (n: number) => fmtMoney(n, cur, usdTry);
  const ago = (iso: string) => {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return t.feed_now;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} ${t.feed_min} ${t.feed_ago}`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} ${t.feed_hour} ${t.feed_ago}`;
    return `${Math.floor(h / 24)} ${t.feed_day} ${t.feed_ago}`;
  };

  if (loading) return null;
  if (events.length === 0) return null;

  return (
    <div className="glass" style={{ padding: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span className="live-dot" />
        <span className="eyebrow">{t.feed_title}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {events.map((e, i) => {
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0", borderBottom: i < events.length - 1 ? "1px solid var(--rule)" : "none" }}>
              <Link href={`/u/${e.userHandle}`} style={{ textDecoration: "none", flexShrink: 0 }}>
                <Avatar initials={initials(e.userName)} gradient={grad(e.userHandle || e.userName)} image={e.userImage} size={30} ring={false} />
              </Link>
              <div style={{ minWidth: 0, flex: 1, fontSize: ".84rem", lineHeight: 1.35 }}>
                <Link href={`/u/${e.userHandle}`} style={{ fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>
                  {e.userName}
                </Link>{" "}
                <FeedText e={e} t={t} money={money} />
              </div>
              <span className="mono" style={{ fontSize: ".58rem", color: "var(--muted)", flexShrink: 0, whiteSpace: "nowrap" }}>
                {ago(e.at)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FeedText({ e, t, money }: { e: FeedEvent; t: ReturnType<typeof useT>; money: (n: number) => string }) {
  const tk = <strong style={{ fontWeight: 600 }}>{e.ticker}</strong>;
  if (e.kind === "buy" || e.kind === "sell") {
    const verbColor = e.kind === "buy" ? "var(--green-t)" : "var(--red-t)";
    return (
      <span style={{ color: "var(--ink-soft)" }}>
        {tk} <span style={{ color: verbColor, fontWeight: 600 }}>{e.kind === "buy" ? t.feed_bought : t.feed_sold}</span>
        {e.amountTry != null && <span className="mono" style={{ color: "var(--muted)", fontSize: ".78rem" }}> · {money(e.amountTry)}</span>}
      </span>
    );
  }
  // leveraged
  const sideTxt = `${e.side === "long" ? t.fut_long : t.fut_short} ${e.leverage}x`;
  const sideColor = e.side === "long" ? "var(--green-t)" : "var(--red-t)";
  if (e.kind === "open") {
    return (
      <span style={{ color: "var(--ink-soft)" }}>
        {tk} <span style={{ color: sideColor, fontWeight: 600 }}>{sideTxt}</span> {t.feed_opened}
      </span>
    );
  }
  // close
  const up = (e.pnlTry ?? 0) >= 0;
  return (
    <span style={{ color: "var(--ink-soft)" }}>
      {tk} {sideTxt} {e.liquidated ? <span style={{ color: "var(--red-t)", fontWeight: 600 }}>{t.feed_liquidated}</span> : t.feed_closed}
      {!e.liquidated && e.pnlTry != null && (
        <span className="mono" style={{ color: up ? "var(--green-t)" : "var(--red-t)", fontSize: ".78rem" }}> · {up ? "+" : ""}{money(e.pnlTry)}</span>
      )}
    </span>
  );
}
