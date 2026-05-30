// ─────────────────────────────────────────────────────────────
// CoinGecko — real crypto spot prices, directly in TRY.
// Single batched call: /simple/price?ids=...&vs_currencies=try,usd
// The try/usd ratio doubles as our USD→TRY FX source.
// ─────────────────────────────────────────────────────────────

export interface CryptoQuote {
  /** CoinGecko id, e.g. "bitcoin" */
  id: string;
  priceTry: number;
  priceUsd: number;
  changePct24h: number | null;
}

export interface CryptoResult {
  quotes: Map<string, CryptoQuote>;
  /** Derived USD→TRY rate (from BTC try/usd), or null if unavailable. */
  usdTry: number | null;
}

const BASE = "https://api.coingecko.com/api/v3";

/** Fetch spot TRY prices for the given CoinGecko ids. */
export async function fetchCryptoTry(ids: string[]): Promise<CryptoResult> {
  const quotes = new Map<string, CryptoQuote>();
  if (ids.length === 0) return { quotes, usdTry: null };

  const url =
    `${BASE}/simple/price?ids=${encodeURIComponent(ids.join(","))}` +
    `&vs_currencies=try,usd&include_24hr_change=true`;

  const resp = await fetch(url, {
    headers: { Accept: "application/json" },
    // Next.js: don't cache at the fetch layer — we cache in the aggregator.
    cache: "no-store",
  });
  if (!resp.ok) throw new Error(`CoinGecko ${resp.status}`);

  const data = (await resp.json()) as Record<
    string,
    { try?: number; usd?: number; try_24h_change?: number }
  >;

  let usdTry: number | null = null;
  for (const id of ids) {
    const row = data[id];
    if (!row || typeof row.try !== "number") continue;
    quotes.set(id, {
      id,
      priceTry: row.try,
      priceUsd: row.usd ?? 0,
      changePct24h:
        typeof row.try_24h_change === "number" ? row.try_24h_change : null,
    });
    if (
      usdTry === null &&
      typeof row.try === "number" &&
      typeof row.usd === "number" &&
      row.usd > 0
    ) {
      usdTry = row.try / row.usd;
    }
  }

  return { quotes, usdTry };
}
