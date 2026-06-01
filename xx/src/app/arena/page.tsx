"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PortfolioWheel } from "@/components/PortfolioWheel";
import { MiniWheel } from "@/components/MiniWheel";
import { AppHeader } from "@/components/AppHeader";
import { useLocale, useT } from "@/components/Providers";
import { fmtTry, type DemoSlice } from "@/lib/demo";

interface LeaderSlice { ticker: string; name: string; color: string; weight: number; valueTry: number }
interface LeaderRow {
  id: string; name: string; handle: string; image: string | null;
  totalTry: number; returnPct: number; cashTry: number; holdingsCount: number;
  slices: LeaderSlice[]; followers: number; likes: number; tradesCount: number;
}

type Sort = "gainers" | "losers" | "liked";
const SORTS: { key: Sort; labelKey: "sort_gainers" | "sort_losers" | "sort_liked" }[] = [
  { key: "gainers", labelKey: "sort_gainers" },
  { key: "losers", labelKey: "sort_losers" },
  { key: "liked", labelKey: "sort_liked" },
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
  const { status } = useSession();
  const locale = useLocale();
  const t = useT();
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<Sort>("gainers");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/leaderboard", { cache: "no-store" });
        const j = await r.json();
        if (alive && j.ok) setRows(j.leaderboard);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 60_000); // live: refresh every 60s
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const ranked = useMemo(() => {
    const list = [...rows];
    if (sort === "gainers") list.sort((a, b) => b.returnPct - a.returnPct);
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
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "20px 24px 0", width: "100%" }}>
        <AppHeader loggedIn={status === "authenticated"} locale={locale} />
      </div>

      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "12px 24px 80px", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span className="live-dot" />
          <span className="eyebrow">{t.ar_eyebrow}</span>
        </div>
        <h1 className="display" style={{ fontSize: "clamp(2rem,5vw,3.2rem)", margin: 0 }}>{t.ar_title}</h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>
          {loading ? t.ar_loading : `${rows.length} ${t.ar_subtitle}`}
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
                {t[s.labelKey]}
              </button>
            ))}
          </div>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.ar_search}
            style={{ width: 220, padding: ".55rem .8rem", borderRadius: 9, border: "1px solid var(--card-border)", background: "var(--fill)", color: "var(--ink)", fontSize: ".82rem", outline: "none" }} />
        </div>

        {loading ? (
          <div className="glass" style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>{t.ar_board_loading}</div>
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {spotlight && <Spotlight r={spotlight} rank={valueRank.get(spotlight.id) ?? 1} />}

            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "40px 0 16px" }}>
              <h2 className="display" style={{ fontSize: "1.5rem", margin: 0 }}>{t.ar_all}</h2>
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
  const t = useT();
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
          <div><div className="eyebrow">{t.sp_value}</div><div className="mono" style={{ fontSize: "1.5rem", fontWeight: 600, marginTop: 2 }}>{fmtTry(r.totalTry)}</div></div>
          <div><div className="eyebrow">{t.sp_return}</div><div className="mono" style={{ fontSize: "1.5rem", fontWeight: 600, marginTop: 2, color: up ? "var(--green-t)" : "var(--red-t)" }}>{up ? "+" : ""}{num(r.returnPct)}%</div></div>
          <div><div className="eyebrow">{t.sp_likes}</div><div className="mono" style={{ fontSize: "1.5rem", fontWeight: 600, marginTop: 2 }}>{r.likes}</div></div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href={`/u/${r.handle}`} className="btn btn-accent" style={{ padding: ".7rem 1.3rem", textDecoration: "none" }}>{t.sp_inspect}</Link>
        </div>
      </div>
    </div>
  );
}

function ArenaCard({ p, rank }: { p: LeaderRow; rank: number }) {
  const t = useT();
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
          {p.holdingsCount} {t.ar_assets}<br />♥ {p.likes}
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  const t = useT();
  return (
    <div className="glass" style={{ padding: "48px 32px", textAlign: "center" }}>
      <pre className="mono" style={{ color: "var(--accent)", fontSize: ".7rem", lineHeight: 1.3, margin: "0 0 18px" }}>{`   ___ ___ ___ ___\n  | _ \\ __| _ \\ _ \\\n  |   / _||   /   /\n  |_|_\\___|_|_\\_|_\\`}</pre>
      <h3 className="display" style={{ fontSize: "1.4rem", margin: "0 0 8px" }}>{t.ar_empty_h}</h3>
      <p style={{ color: "var(--muted)", maxWidth: 420, margin: "0 auto 20px" }}>{t.ar_empty_p}</p>
      <Link href="/join" className="btn btn-accent" style={{ textDecoration: "none", padding: ".7rem 1.4rem" }}>{t.ar_empty_cta}</Link>
    </div>
  );
}

function ExamplesNote() {
  const t = useT();
  return (
    <p className="mono" style={{ marginTop: 40, textAlign: "center", fontSize: ".62rem", color: "var(--muted)", opacity: 0.7 }}>
      ━━━  {t.ar_examples}  ━━━
    </p>
  );
}
