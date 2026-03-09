// Cloudflare Pages Function: /api/tefas?fonKod=TZT&start=17.02.2026&end=09.03.2026
// Proxies TEFAS (Turkish Electronic Fund Trading Platform) API for fund prices
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const fonKod = url.searchParams.get('fonKod');
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300, s-maxage=600',
  };

  if (context.request.method === 'OPTIONS') {
    return new Response('', { headers });
  }

  if (!fonKod || !start || !end) {
    return new Response(JSON.stringify({ error: 'Missing params: fonKod, start, end required' }), { status: 400, headers });
  }

  // Sanitize fonKod (only allow alphanumeric)
  if (!/^[A-Za-z0-9]+$/.test(fonKod)) {
    return new Response(JSON.stringify({ error: 'Invalid fonKod' }), { status: 400, headers });
  }

  try {
    const body = `fonKod=${encodeURIComponent(fonKod)}&baslangicTarihi=${encodeURIComponent(start)}&bitisTarihi=${encodeURIComponent(end)}`;
    const resp = await fetch('https://www.tefas.gov.tr/api/DB/BindHistoryInfo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://www.tefas.gov.tr',
        'Referer': 'https://www.tefas.gov.tr/FonAnaliz.aspx',
      },
      body,
    });

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `TEFAS HTTP ${resp.status}` }), { status: resp.status, headers });
    }

    const data = await resp.json();
    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
