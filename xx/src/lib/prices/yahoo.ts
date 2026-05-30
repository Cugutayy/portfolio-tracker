// ─────────────────────────────────────────────────────────────
// Yahoo Finance — stocks, indices, commodities, FX.
// Uses the public chart endpoint (v8) which returns regularMarketPrice
// + the instrument's native currency in `meta`. Reliable, no crumb.
// ─────────────────────────────────────────────────────────────

export interface YahooQuote {
  symbol: string;
  /** Price in the instrument's native currency. */
  price: number;
  /** "USD", "TRY", etc. */
  currency: string;
  previousClose: number | null;
}

const CHART = "https://query1.finance.yahoo.com/v8/finance/chart";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function fetchOne(symbol: string): Promise<YahooQuote | null> {
  const url = `${CHART}/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as {
      chart?: {
        result?: Array<{
          meta?: {
            regularMarketPrice?: number;
            chartPreviousClose?: number;
            previousClose?: number;
            currency?: string;
          };
        }>;
      };
    };
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta || typeof meta.regularMarketPrice !== "number") return null;
    return {
      symbol,
      price: meta.regularMarketPrice,
      currency: meta.currency ?? "USD",
      previousClose:
        meta.chartPreviousClose ?? meta.previousClose ?? null,
    };
  } catch {
    return null;
  }
}

const YAHOO_CONCURRENCY = Number(process.env.YAHOO_CONCURRENCY ?? 8);

/** Run an async mapper over items with a bounded concurrency pool. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

/** Batch-fetch Yahoo quotes with bounded concurrency. Missing symbols are absent. */
export async function fetchYahooQuotes(
  symbols: string[],
): Promise<Map<string, YahooQuote>> {
  const out = new Map<string, YahooQuote>();
  const results = await mapLimit(symbols, YAHOO_CONCURRENCY, fetchOne);
  for (const q of results) if (q) out.set(q.symbol, q);
  return out;
}

/** USD→TRY via Yahoo (fallback FX source). */
export async function fetchUsdTryYahoo(): Promise<number | null> {
  const q = await fetchOne("USDTRY=X");
  return q?.price ?? null;
}
