// ─────────────────────────────────────────────────────────────
// Binance — near real-time crypto spot prices (USDT) + USD→TRY FX.
// Public data mirror (no API key, no geo-block): data-api.binance.vision.
// Much fresher than CoinGecko's free tier → closes the arbitrage window
// without needing an execution spread.
// ─────────────────────────────────────────────────────────────
import type { CryptoQuote } from "./coingecko";

const BASE = "https://data-api.binance.vision/api/v3";

export interface BinanceResult {
  /** keyed by CoinGecko id so it drops into the existing aggregator */
  quotes: Map<string, CryptoQuote>;
  /** USDT→TRY (≈ USD→TRY), from the USDTTRY pair */
  usdTry: number | null;
  /** CoinGecko ids Binance couldn't price (caller falls back to CoinGecko) */
  missing: string[];
}

/** assets: { ticker: "BTC", cgId: "bitcoin" } — Binance symbol = TICKER + "USDT". */
export async function fetchCryptoBinance(
  assets: { ticker: string; cgId: string }[],
): Promise<BinanceResult> {
  const quotes = new Map<string, CryptoQuote>();
  if (assets.length === 0) return { quotes, usdTry: null, missing: [] };

  const symToCg = new Map<string, string>();
  for (const a of assets) symToCg.set(`${a.ticker.toUpperCase()}USDT`, a.cgId);

  // Fetch ALL tickers (no symbols filter): one invalid symbol in a filtered
  // batch makes Binance reject the whole request, so we pick ours from the full
  // list instead. Any coin not listed simply falls back to CoinGecko.
  const [tickerResp, fxResp] = await Promise.all([
    fetch(`${BASE}/ticker/24hr`, { cache: "no-store" }),
    fetch(`${BASE}/ticker/price?symbol=USDTTRY`, { cache: "no-store" }),
  ]);
  if (!tickerResp.ok) throw new Error(`Binance ${tickerResp.status}`);

  let usdTry: number | null = null;
  if (fxResp.ok) {
    const fx = (await fxResp.json()) as { price?: string };
    const p = Number(fx.price);
    if (p > 0) usdTry = p;
  }

  const arr = (await tickerResp.json()) as {
    symbol: string;
    lastPrice: string;
    priceChangePercent: string;
  }[];

  const found = new Set<string>();
  for (const t of Array.isArray(arr) ? arr : []) {
    const cg = symToCg.get(t.symbol);
    if (!cg) continue;
    const usd = Number(t.lastPrice);
    if (!(usd > 0)) continue;
    found.add(t.symbol);
    quotes.set(cg, {
      id: cg,
      priceUsd: usd,
      priceTry: usdTry ? usd * usdTry : 0, // recomputed by the aggregator with resolved FX
      changePct24h: Number(t.priceChangePercent) || null,
    });
  }

  const missing = assets
    .filter((a) => !found.has(`${a.ticker.toUpperCase()}USDT`))
    .map((a) => a.cgId);

  return { quotes, usdTry, missing };
}
