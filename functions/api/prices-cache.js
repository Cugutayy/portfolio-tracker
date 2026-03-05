// Cloudflare Pages Function: /api/prices-cache
// Fetches ALL market symbols in one request — cached 5 min on edge
const SYMBOLS = {
  'XU100.IS': 'BIST-100', 'XU030.IS': 'BIST-30',
  '^GSPC': 'S&P 500', '^IXIC': 'NASDAQ', '^DJI': 'Dow Jones',
  '^FTSE': 'FTSE 100', '^GDAXI': 'DAX',
  'THYAO.IS': 'THYAO', 'ASELS.IS': 'ASELS', 'GARAN.IS': 'GARAN',
  'SISE.IS': 'SISE', 'EREGL.IS': 'EREGL', 'BIMAS.IS': 'BIMAS',
  'GC=F': 'Gold', 'SI=F': 'Silver', 'CL=F': 'Oil', 'NG=F': 'NatGas',
  'USDTRY=X': 'USD/TRY', 'EURTRY=X': 'EUR/TRY',
  'GBPTRY=X': 'GBP/TRY', 'EURUSD=X': 'EUR/USD',
  'BTC-USD': 'Bitcoin', 'ETH-USD': 'Ethereum',
  'SOL-USD': 'Solana', 'XRP-USD': 'XRP',
  'GAU.IS': 'Gram Altin',
};

async function fetchYahoo(sym) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose || meta.previousClose || price;
    return {
      price,
      change: +(price - prev).toFixed(4),
      changePct: prev ? +((price - prev) / prev * 100).toFixed(4) : 0,
      currency: meta.currency || '',
    };
  } catch (e) {
    return null;
  }
}

export async function onRequest(context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60, s-maxage=300',
  };

  if (context.request.method === 'OPTIONS') {
    return new Response('', { headers });
  }

  try {
    const syms = Object.keys(SYMBOLS);
    const results = {};

    // Fetch in parallel batches of 5
    for (let i = 0; i < syms.length; i += 5) {
      const batch = syms.slice(i, i + 5);
      const fetched = await Promise.all(batch.map(s => fetchYahoo(s)));
      batch.forEach((sym, idx) => {
        if (fetched[idx]) {
          results[sym] = { ...fetched[idx], name: SYMBOLS[sym] };
        }
      });
      if (i + 5 < syms.length) await new Promise(r => setTimeout(r, 200));
    }

    return new Response(JSON.stringify({
      prices: results,
      count: Object.keys(results).length,
      total: syms.length,
      timestamp: Date.now(),
    }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}
