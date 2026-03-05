// Cloudflare Pages Function: /api/prices?sym=AAPL
// Zero cold start — runs on Cloudflare edge (300+ locations)
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const sym = url.searchParams.get('sym');

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
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=1d`;
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
