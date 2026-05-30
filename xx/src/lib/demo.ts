// ─────────────────────────────────────────────────────────────
// Deterministic demo data — 100 competing portfolios.
// Seeded so server and client render identically (no hydration drift).
// Swappable for /api/leaderboard once Phase 2/3 land.
// ─────────────────────────────────────────────────────────────

import { ASSETS, type Asset } from "./assets";

export const STARTING_BALANCE = 1_000_000;

export type Timeframe = "1g" | "1h" | "1a" | "ytd" | "all";

export interface DemoSlice {
  ticker: string;
  name: string;
  color: string;
  weight: number; // 0..1
  valueTry: number;
}

export interface DemoPortfolio {
  id: string;
  name: string;
  handle: string;
  initials: string;
  gradient: string; // avatar background
  slices: DemoSlice[];
  totalValueTry: number;
  returns: Record<Timeframe, number>; // percent
  equity: number[]; // normalized equity curve (start 100)
  // risk metrics
  volatility: number; // %
  beta: number;
  maxDrawdown: number; // % (negative)
  sharpe: number;
  followers: number;
  trades: number;
}

// mulberry32 — tiny deterministic PRNG
function rng(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = [
  "Ahmet", "Mehmet", "Mustafa", "Ayşe", "Emre", "Defne", "Can", "Elif", "Burak",
  "Zeynep", "Kerem", "Selin", "Onur", "Ece", "Cem", "Deniz", "Murat", "Gizem",
  "Barış", "Aslı", "Tolga", "Merve", "Serkan", "Buse", "Volkan", "İrem", "Hakan",
  "Sıla", "Umut", "Naz", "Furkan", "Yağmur", "Berk", "Pelin", "Arda", "Melis",
  "Kaan", "Derya", "Ozan", "Ceren",
];
const LAST = [
  "Yılmaz", "Kaya", "Demir", "Çelik", "Şahin", "Yıldız", "Aydın", "Öztürk",
  "Arslan", "Doğan", "Kılıç", "Aslan", "Çetin", "Kara", "Koç", "Kurt",
  "Özdemir", "Şimşek", "Polat", "Korkmaz", "Erdoğan", "Aksoy", "Bulut", "Güneş",
];
const GRADS = [
  "linear-gradient(135deg,#c8a064,#7a5a2e)",
  "linear-gradient(135deg,#4f8ff7,#23408e)",
  "linear-gradient(135deg,#a78bfa,#5b3fb0)",
  "linear-gradient(135deg,#4ade80,#1d7a45)",
  "linear-gradient(135deg,#f87171,#92312f)",
  "linear-gradient(135deg,#22d3ee,#0e6b80)",
  "linear-gradient(135deg,#fb923c,#9a4a17)",
  "linear-gradient(135deg,#e879f9,#7b2d8a)",
];

function trMap(s: string) {
  const m: Record<string, string> = { ı:"i", İ:"i", ş:"s", Ş:"s", ğ:"g", Ğ:"g", ü:"u", Ü:"u", ö:"o", Ö:"o", ç:"c", Ç:"c" };
  return s.replace(/[ıİşŞğĞüÜöÖçÇ]/g, (c) => m[c] ?? c);
}

function buildPortfolio(i: number): DemoPortfolio {
  const r = rng(i * 2654435761 + 12345);
  const first = FIRST[Math.floor(r() * FIRST.length)];
  const last = LAST[Math.floor(r() * LAST.length)];
  const name = `${first} ${last}`;
  const handle = `${trMap(first).toLowerCase()}${trMap(last).toLowerCase().slice(0, 3)}${i}`;
  const initials = (first[0] + last[0]).toLocaleUpperCase("tr");
  const gradient = GRADS[i % GRADS.length];

  // 1..5 assets, weighted
  const n = 1 + Math.floor(r() * 5);
  const pool = [...ASSETS];
  const picks: Asset[] = [];
  for (let k = 0; k < n && pool.length; k++) {
    picks.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  }
  const raw = picks.map(() => 0.1 + r());
  const sum = raw.reduce((a, b) => a + b, 0);
  const weights = raw.map((w) => w / sum);

  // all-time return: wide spread, slight positive skew
  const allReturn = +((r() - 0.42) * 80).toFixed(1); // ~ -34% .. +46%
  const totalValueTry = Math.round(STARTING_BALANCE * (1 + allReturn / 100));

  const slices: DemoSlice[] = picks
    .map((a, idx) => ({
      ticker: a.ticker,
      name: a.name,
      color: a.color,
      weight: weights[idx],
      valueTry: Math.round(totalValueTry * weights[idx]),
    }))
    .sort((a, b) => b.weight - a.weight);

  // timeframe returns derived from all-time with noise
  const f = (mult: number, spread: number) =>
    +(allReturn * mult + (r() - 0.5) * spread).toFixed(1);
  const returns: Record<Timeframe, number> = {
    "1g": f(0.03, 4),
    "1h": f(0.12, 8),
    "1a": f(0.4, 14),
    ytd: f(0.8, 18),
    all: allReturn,
  };

  // equity curve (start 100 → 100*(1+all))
  const steps = 32;
  const end = 100 * (1 + allReturn / 100);
  const equity: number[] = [];
  let v = 100;
  for (let s = 0; s < steps; s++) {
    const target = 100 + (end - 100) * (s / (steps - 1));
    v = target + (r() - 0.5) * 6 * (s > 0 && s < steps - 1 ? 1 : 0);
    equity.push(+v.toFixed(2));
  }
  equity[0] = 100;
  equity[steps - 1] = +end.toFixed(2);

  // risk metrics
  const volatility = +(8 + r() * 32).toFixed(1);
  const beta = +(0.4 + r() * 1.4).toFixed(2);
  const maxDrawdown = -+(3 + r() * 30).toFixed(1);
  const sharpe = +(((allReturn / 100) / (volatility / 100)) || 0).toFixed(2);

  return {
    id: `p${i}`,
    name,
    handle,
    initials,
    gradient,
    slices,
    totalValueTry,
    returns,
    equity,
    volatility,
    beta,
    maxDrawdown,
    sharpe,
    followers: Math.floor(r() * 1200),
    trades: 5 + Math.floor(r() * 240),
  };
}

let _cache: DemoPortfolio[] | null = null;

// Real friends compete here now — demo is just a small "örnek" seed
// so the screen isn't empty before everyone has joined.
export const DEMO_COUNT = 6;

export function getDemoPortfolios(): DemoPortfolio[] {
  if (_cache) return _cache;
  _cache = Array.from({ length: DEMO_COUNT }, (_, i) => buildPortfolio(i + 1));
  return _cache;
}

export function fmtTry(n: number): string {
  if (Math.abs(n) >= 1_000_000)
    return (n / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 2 }) + "M ₺";
  if (Math.abs(n) >= 1_000)
    return Math.round(n / 1_000).toLocaleString("tr-TR") + "K ₺";
  return n.toLocaleString("tr-TR") + " ₺";
}

export const TIMEFRAMES: { key: Timeframe; label: string }[] = [
  { key: "1g", label: "Günlük" },
  { key: "1h", label: "Haftalık" },
  { key: "1a", label: "Aylık" },
  { key: "ytd", label: "YTD" },
  { key: "all", label: "Tüm zamanlar" },
];
