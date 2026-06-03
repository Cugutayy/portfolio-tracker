"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { useT } from "@/components/Providers";

interface NItem {
  kind: "comment" | "like";
  name: string;
  handle: string;
  image: string | null;
  body?: string;
  at: string;
}
interface Data {
  rank: number;
  total: number;
  likes: { name: string; handle: string; image: string | null; at: string }[];
  comments: { name: string; handle: string; image: string | null; body: string; at: string }[];
}

const grad = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const a = h % 360;
  return `linear-gradient(135deg, hsl(${a} 55% 45%), hsl(${(a + 60) % 360} 55% 30%))`;
};
const ini = (n: string) => n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export function NotificationBell() {
  const t = useT();
  const [data, setData] = useState<Data | null>(null);
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] = useState<number>(0);
  const [ackRank, setAckRank] = useState<number | null>(null);

  useEffect(() => {
    setSeenAt(Number(localStorage.getItem("xx-notif-seen") ?? 0));
    const ar = localStorage.getItem("xx-rank-ack");
    setAckRank(ar != null ? Number(ar) : null);
  }, []);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/notifications", { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      if (j.ok) setData(j);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const items: NItem[] = data
    ? [
        ...data.comments.map((c) => ({ kind: "comment" as const, name: c.name, handle: c.handle, image: c.image, body: c.body, at: c.at })),
        ...data.likes.map((l) => ({ kind: "like" as const, name: l.name, handle: l.handle, image: l.image, at: l.at })),
      ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    : [];

  const rankChanged = data != null && ackRank != null && ackRank !== data.rank;
  const unread = items.filter((i) => new Date(i.at).getTime() > seenAt).length + (rankChanged ? 1 : 0);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && data) {
      const now = Date.now();
      localStorage.setItem("xx-notif-seen", String(now));
      localStorage.setItem("xx-rank-ack", String(data.rank));
      setSeenAt(now);
      setAckRank(data.rank);
    }
  }

  const ago = (iso: string) => {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return t.feed_now;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} ${t.feed_min} ${t.feed_ago}`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} ${t.feed_hour} ${t.feed_ago}`;
    return `${Math.floor(h / 24)} ${t.feed_day} ${t.feed_ago}`;
  };

  const delta = data != null && ackRank != null ? ackRank - data.rank : 0; // + = improved (rank number down)

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={toggle}
        aria-label={t.notif_title}
        className="btn"
        style={{ position: "relative", padding: ".4rem .55rem", lineHeight: 1 }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span style={{ position: "absolute", top: -5, right: -5, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 999, background: "var(--red-t)", color: "#fff", fontSize: ".6rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div
            className="glass"
            style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 320, maxWidth: "90vw", maxHeight: 420, overflowY: "auto", zIndex: 41, padding: 14, boxShadow: "0 10px 40px rgba(0,0,0,0.18)" }}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
              <span className="eyebrow">{t.notif_title}</span>
              {data && (
                <span className="mono" style={{ fontSize: ".66rem", color: "var(--muted)" }}>
                  {t.notif_rank} #{data.rank}/{data.total}
                  {delta !== 0 && (
                    <span style={{ color: delta > 0 ? "var(--green-t)" : "var(--red-t)", marginLeft: 5 }}>
                      {delta > 0 ? `▲${delta}` : `▼${-delta}`}
                    </span>
                  )}
                </span>
              )}
            </div>

            {items.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: ".82rem", padding: "10px 0" }}>{t.notif_empty}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {items.slice(0, 25).map((it, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: i < Math.min(items.length, 25) - 1 ? "1px solid var(--rule)" : "none" }}>
                    <Link href={`/u/${it.handle}`} style={{ flexShrink: 0 }}>
                      <Avatar initials={ini(it.name)} gradient={grad(it.handle || it.name)} image={it.image} size={28} ring={false} />
                    </Link>
                    <div style={{ minWidth: 0, flex: 1, fontSize: ".82rem", lineHeight: 1.35 }}>
                      <Link href={`/u/${it.handle}`} style={{ fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>{it.name}</Link>{" "}
                      <span style={{ color: "var(--ink-soft)" }}>
                        {it.kind === "like" ? t.notif_liked : `${t.notif_commented}: "${(it.body ?? "").slice(0, 40)}"`}
                      </span>
                    </div>
                    <span className="mono" style={{ fontSize: ".56rem", color: "var(--muted)", flexShrink: 0, whiteSpace: "nowrap" }}>{ago(it.at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
