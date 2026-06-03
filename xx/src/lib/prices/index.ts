// ─────────────────────────────────────────────────────────────
// Price aggregator — single source of truth for live TL prices.
//
// Crypto  → CoinGecko (already TRY)
// Stocks / indices / commodities / FX → Yahoo (native ccy → ×USDTRY)
// BIST (.IS) → Yahoo returns TRY directly, no conversion.
//
// A short in-memory cache (PRICE_TTL_MS) keeps us well under the
// public-API rate limits even with many concurrent valuations.
// ─────────────────────────────────────────────────────────────

import { ASSETS, type Asset } from "@/lib/assets";
import { fetchCryptoTry } from "./coingecko";
import { fetchYahooQuotes, fetchUsdTryYahoo } from "./yahoo";

export interface LivePrice {
  ticker: string;
  name: string;
  type: Asset["type"];
  /** Spot price in TRY (used for portfolio valuation). */
  priceTry: number;
  /** Spot price in the instrument's native currency (used for display). */
  nativePrice: number;
  /** Native currency: "USD" | "TRY" (indices report their own ccy). */
  nativeCcy: string;
  /** 24h / day change %, when available. */
  changePct: number | null;
  source: "coingecko" | "yahoo";
}

export interface PriceSnapshot {
  prices: Record<string, LivePrice>;
  usdTry: number;
  fetchedAt: number;
  /** tickers we failed to price this round. */
  missing: string[];
}

const PRICE_TTL_MS = Number(process.env.PRICE_TTL_MS ?? 30_000);
const USDTRY_FALLBACK = Number(process.env.PRICE_USDTRY_FALLBACK ?? 42);

let cache: PriceSnapshot | null = null;
let inflight: Promise<PriceSnapshot> | null = null;

function isFresh(s: PriceSnapshot | null): s is PriceSnapshot {
  return !!s && Date.now() - s.fetchedAt < PRICE_TTL_MS;
}

async function build(): Promise<PriceSnapshot> {
  const cryptoAssets = ASSETS.filter((a) => a.type === "crypto" && a.symbol);
  const otherAssets = ASSETS.filter((a) => a.type !== "crypto" && a.symbol);

  const [cryptoRes, yahooMap] = await Promise.all([
    fetchCryptoTry(cryptoAssets.map((a) => a.symbol!)).catch(() => ({
      quotes: new Map(),
      usdTry: null,
    })),
    fetchYahooQuotes(otherAssets.map((a) => a.symbol!)).catch(() => new Map()),
  ]);

  // Resolve USD→TRY: CoinGecko-derived first, then Yahoo, then fallback.
  let usdTry = cryptoRes.usdTry;
  if (!usdTry || usdTry <= 0) usdTry = await fetchUsdTryYahoo().catch(() => null);
  if (!usdTry || usdTry <= 0) usdTry = USDTRY_FALLBACK;

  const prices: Record<string, LivePrice> = {};
  const missing: string[] = [];

  for (const a of cryptoAssets) {
    const q = cryptoRes.quotes.get(a.symbol!);
    if (!q) {
      missing.push(a.ticker);
      continue;
    }
    prices[a.ticker] = {
      ticker: a.ticker,
      name: a.name,
      type: a.type,
      priceTry: q.priceTry,
      nativePrice: q.priceUsd > 0 ? q.priceUsd : q.priceTry / usdTry,
      nativeCcy: "USD",
      changePct: q.changePct24h,
      source: "coingecko",
    };
  }

  for (const a of otherAssets) {
    const q = yahooMap.get(a.symbol!);
    if (!q) {
      missing.push(a.ticker);
      continue;
    }
    const inTry = q.currency === "TRY";
    const priceTry = inTry ? q.price : q.price * usdTry;
    const prev =
      q.previousClose != null
        ? inTry
          ? q.previousClose
          : q.previousClose * usdTry
        : null;
    const changePct =
      prev && prev > 0 ? ((priceTry - prev) / prev) * 100 : null;
    prices[a.ticker] = {
      ticker: a.ticker,
      name: a.name,
      type: a.type,
      priceTry,
      nativePrice: q.price,
      nativeCcy: q.currency || "USD",
      changePct,
      source: "yahoo",
    };
  }

  return { prices, usdTry, fetchedAt: Date.now(), missing };
}

/** Get all live prices (cached). */
export async function getLivePrices(): Promise<PriceSnapshot> {
  if (isFresh(cache)) return cache;
  if (inflight) return inflight;
  inflight = build()
    .then((snap) => {
      cache = snap;
      return snap;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * Freshest possible snapshot for trade execution — forces a refetch when the
 * cache is older than `maxAgeMs`. Anti front-running: a user can't fill at a
 * stale price they saw move on a real exchange; the fill uses the latest data
 * our sources have.
 */
export async function getFreshPrices(maxAgeMs = 10_000): Promise<PriceSnapshot> {
  if (cache && Date.now() - cache.fetchedAt < maxAgeMs) return cache;
  if (inflight) return inflight;
  inflight = build()
    .then((snap) => {
      cache = snap;
      return snap;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Convenience: price for a single ticker (TRY), or null. */
export async function getPriceTry(ticker: string): Promise<number | null> {
  const snap = await getLivePrices();
  return snap.prices[ticker]?.priceTry ?? null;
}
