"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PortfolioWheel } from "@/components/PortfolioWheel";
import { MiniWheel } from "@/components/MiniWheel";
import { fmtTry, type DemoSlice } from "@/lib/demo";

interface LeaderSlice { ticker: string; name: string; color: string; weight: number; valueTry: number }
interface LeaderRow {
  id: string; name: string; handle: string; image: string | null;
  totalTry: number; returnPct: number; cashTry: number; holdingsCount: number;
  slices: LeaderSlice[]; followers: number; likes: number; tradesCount: number;
}

type Sort = "value" | "gainers" | "losers" | "liked";
const SORTS: { key: Sort; label: string }[] = [
  { key: "value", label: "En değerli" },
  { key: "gainers", label: "En çok kazanan" },
  { key: "losers", label: "En çok kaybeden" },
  { key: "liked", label: "En çok beğenilen" },
];

const num = (n: number, d = 2) =>
  new Intl.NumberFormat("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
function gradFor(s: string) {
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const a = h % 360; return `linear-gradient(135deg, hsl(${a} 55% 45%), hsl(${(a + 60) % 360} 55% 30%))`;
}
const initialsOf = (n: string) => n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const slicesWithCash = (r: LeaderRow): DemoSlice[] => [
  ...r.slices.map((s) => ({ ticker: s.ticker, name: s.name, color: s.color, weight: s.weight, valueTry: s.valueTry })),
  ...(r.cashTry > 0 ? [{ ticker: "NAKİT", name: "Nakit", color: "rgba(26,24,19,0.16)", weight: r.totalTry > 0 ? r.cashTry / r.totalTry : 0, valueTry: r.cashTry }] : []),
];

export default function ArenaPage() {
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<Sort>("value");
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/leaderboard", { cache: "no-store" });
      const j = await r.json();
      if (j.ok) setRows(j.leaderboard);
      setLoading(false);
    })();
  }, []);

  const ranked = useMemo(() => {
    const list = [...rows];
    if (sort === "value") list.sort((a, b) => b.totalTry - a.totalTry);
    else if (sort === "gainers") list.sort((a, b) => b.returnPct - a.returnPct);
    else if (sort === "losers") list.sort((a, b) => a.returnPct - b.returnPct);
    else list.sort((a, b) => b.likes - a.likes);
    return list;
  }, [rows, sort]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    if (!q) return ranked;
    return ranked.filter((p) => p.name.toLocaleLowerCase("tr").includes(q) || p.handle.includes(q));
  }, [ranked, query]);

  const valueRank = useMemo(() => {
    const m = new Map<string, number>();
    [...rows].sort((a, b) => b.totalTry - a.totalTry).forEach((r, i) => m.set(r.id, i + 1));
    return m;
  }, [rows]);

  const spotlight = ranked[0];

  return (
    <main style={{ minHeight: "100dvh" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", maxWidth: 1240, margin: "0 auto", width: "100%" }}>
        <Link href="/" style={{ textDecoration: "none", color: "var(--ink)" }}>
          <span className="mono" style={{ fontSize: ".68rem", color: "var(--accent)", letterSpacing: ".18em" }}>[ XX // ARENA ]</span>
        </Link>
        <nav style={{ display: "flex", gap: 10 }}>
          <Link href="/" className="btn" style={{ textDecoration: "none" }}>Ana sayfa</Link>
          <Link href="/portfolio" className="btn" style={{ textDecoration: "none" }}>Portföyüm</Link>
          <Link href="/join" className="btn btn-accent" style={{ textDecoration: "none" }}>Yarışa katıl</Link>
        </nav>
      </header>

      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "12px 24px 80px", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span className="live-dot" />
          <span className="eyebrow">canlı liderlik · gerçek piyasa fiyatları</span>
        </div>
        <h1 className="display" style={{ fontSize: "clamp(2rem,5vw,3.2rem)", margin: 0 }}>Arena</h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>
          {loading ? "Yükleniyor…" : `${rows.length} trader · her biri 1.000.000 ₺ ile başladı`}
        </p>

        {/* controls — centered, aligned */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between", margin: "24px 0 28px" }}>
          <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
            {SORTS.map((s) => (
              <button key={s.key} onClick={() => setSort(s.key)} className="mono"
                style={{
                  padding: ".5rem .9rem", borderRadius: 999, cursor: "pointer", fontSize: ".68rem",
                  border: sort === s.key ? "1px solid var(--accent)" : "1px solid var(--card-border)",
                  background: sort === s.key ? "var(--accent-soft)" : "transparent",
                  color: sort === s.key ? "var(--accent)" : "var(--muted)", transition: "all .15s",
                }}>
                {s.label}
              </button>
            ))}
          </div>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Trader ara…"
            style={{ width: 220, padding: ".55rem .8rem", borderRadius: 9, border: "1px solid var(--card-border)", background: "var(--fill)", color: "var(--ink)", fontSize: ".82rem", outline: "none" }} />
        </div>

        {loading ? (
          <div className="glass" style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>Liderlik yükleniyor…</div>
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {spotlight && <Spotlight r={spotlight} rank={valueRank.get(spotlight.id) ?? 1} />}

            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "40px 0 16px" }}>
              <h2 className="display" style={{ fontSize: "1.5rem", margin: 0 }}>Tüm yarışmacılar</h2>
              <span className="mono" style={{ fontSize: ".7rem", color: "var(--muted)" }}>{filtered.length} / {rows.length}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 14 }}>
              {filtered.map((p) => (
                <ArenaCard key={p.id} p={p} rank={valueRank.get(p.id) ?? 0} />
              ))}
            </div>
          </>
        )}

        <ExamplesNote />
      </div>
    </main>
  );
}

function Spotlight({ r, rank }: { r: LeaderRow; rank: number }) {
  const up = r.returnPct >= 0;
  return (
    <div className="glass spotlight-grid" style={{ padding: "36px 40px" }}>
      <div className="spotlight-wheel" style={{ display: "flex", justifyContent: "center", padding: "0 50px" }}>
        <PortfolioWheel slices={slicesWithCash(r)} initials={initialsOf(r.name)} gradient={gradFor(r.handle)} image={r.image} size={260} />
      </div>
      <div>
        <div className="pw-legend" style={{ flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
          {slicesWithCash(r).map((s) => (
            <div key={s.ticker} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 9px", borderRadius: 8, background: "var(--fill)", border: "1px solid var(--card-border)" }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: s.color }} />
              <span style={{ fontSize: ".78rem", fontWeight: 600 }}>{s.ticker}</span>
              <span className="mono" style={{ fontSize: ".68rem", color: "var(--accent)" }}>{Math.round(s.weight * 100)}%</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span className="display" style={{ fontSize: "1.4rem", color: "var(--accent)" }}>#{rank}</span>
          <h2 className="display" style={{ fontSize: "1.8rem", margin: 0 }}>{r.name}</h2>
        </div>
        <div className="mono" style={{ fontSize: ".72rem", color: "var(--muted)" }}>@{r.handle}</div>

        <div style={{ display: "flex", gap: 28, flexWrap: "wrap", margin: "20px 0" }}>
          <div><div className="eyebrow">Portföy değeri</div><div className="mono" style={{ fontSize: "1.5rem", fontWeight: 600, marginTop: 2 }}>{fmtTry(r.totalTry)}</div></div>
          <div><div className="eyebrow">Getiri</div><div className="mono" style={{ fontSize: "1.5rem", fontWeight: 600, marginTop: 2, color: up ? "var(--green-t)" : "var(--red-t)" }}>{up ? "+" : ""}{num(r.returnPct)}%</div></div>
          <div><div className="eyebrow">Beğeni</div><div className="mono" style={{ fontSize: "1.5rem", fontWeight: 600, marginTop: 2 }}>{r.likes}</div></div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href={`/u/${r.handle}`} className="btn btn-accent" style={{ padding: ".7rem 1.3rem", textDecoration: "none" }}>Portföyü incele</Link>
        </div>
      </div>
    </div>
  );
}

function ArenaCard({ p, rank }: { p: LeaderRow; rank: number }) {
  const up = p.returnPct >= 0;
  return (
    <Link href={`/u/${p.handle}`} className="glass glass-hover" style={{ textDecoration: "none", color: "inherit", padding: 16, display: "flex", flexDirection: "column", gap: 12, border: "1px solid var(--card-border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className="display" style={{ fontSize: "1.1rem", width: 24, textAlign: "center", color: rank <= 3 ? "var(--accent)" : "var(--muted)" }}>{rank}</span>
        <MiniWheel slices={slicesWithCash(p)} initials={initialsOf(p.name)} gradient={gradFor(p.handle)} image={p.image} size={56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: ".9rem", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
          <div className="mono" style={{ fontSize: ".58rem", color: "var(--muted)" }}>@{p.handle}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div className="mono" style={{ fontSize: "1rem", fontWeight: 600, color: up ? "var(--green-t)" : "var(--red-t)" }}>{up ? "+" : ""}{num(p.returnPct)}%</div>
          <div className="mono" style={{ fontSize: ".6rem", color: "var(--muted)" }}>{fmtTry(p.totalTry)}</div>
        </div>
        <div className="mono" style={{ fontSize: ".6rem", color: "var(--muted)", textAlign: "right" }}>
          {p.holdingsCount} varlık<br />♥ {p.likes}
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="glass" style={{ padding: "48px 32px", textAlign: "center" }}>
      <pre className="mono" style={{ color: "var(--accent)", fontSize: ".7rem", lineHeight: 1.3, margin: "0 0 18px" }}>{`   ___ ___ ___ ___\n  | _ \\ __| _ \\ _ \\\n  |   / _||   /   /\n  |_|_\\___|_|_\\_|_\\`}</pre>
      <h3 className="display" style={{ fontSize: "1.4rem", margin: "0 0 8px" }}>Arena seni bekliyor</h3>
      <p style={{ color: "var(--muted)", maxWidth: 420, margin: "0 auto 20px" }}>Henüz kimse katılmadı. İlk 1.000.000 ₺’lik portföyü sen kur, arkadaşlarını davet et.</p>
      <Link href="/join" className="btn btn-accent" style={{ textDecoration: "none", padding: ".7rem 1.4rem" }}>Yarışa katıl</Link>
    </div>
  );
}

function ExamplesNote() {
  return (
    <p className="mono" style={{ marginTop: 40, textAlign: "center", fontSize: ".62rem", color: "var(--muted)", opacity: 0.7 }}>
      ━━━  gerçek arkadaşlarınla, gerçek fiyatlarla, sanal 1M ₺  ━━━
    </p>
  );
}
