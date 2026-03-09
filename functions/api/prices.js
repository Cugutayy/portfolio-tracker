// Cloudflare Pages Function: /api/prices?sym=AAPL
// Supports: range (1d, 1mo, 3mo) and period1/period2 (Unix timestamps)
// Zero cold start — runs on Cloudflare edge (300+ locations)
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const sym = url.searchParams.get('sym');
  const range = url.searchParams.get('range') || '1d';
  const period1 = url.searchParams.get('period1');
  const period2 = url.searchParams.get('period2');
  const interval = url.searchParams.get('interval') || '1d';

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60, s-maxage=300',
  };

  if (context.request.method === 'OPTIONS') {
    return new Response('', { headers });
  }

  if (!sym || !/^[A-Za-z0-9\.\-\=\^]+$/.test(sym)) {
    return new Response(JSON.stringify({ error: 'Invalid symbol' }), { status: 400, headers });
  }

  try {
    let yahooUrl;
    if (period1 && period2) {
      // Explicit date range (Unix timestamps)
      yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?period1=${period1}&period2=${period2}&interval=${interval}`;
    } else {
      // Range-based (1d, 1mo, 3mo, etc.)
      yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=${interval}`;
    }

    const resp = await fetch(yahooUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `Yahoo ${resp.status}` }), { status: resp.status, headers });
    }

    const data = await resp.json();
    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
