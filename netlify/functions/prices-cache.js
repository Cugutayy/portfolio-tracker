// Netlify Scheduled Function — Pre-fetch & cache all market prices
// Called via /.netlify/functions/prices-cache
// Returns all prices in one JSON response — client loads instantly
const https = require('https');

const SYMBOLS = {
  // Indices
  '^XU100': 'BIST-100', '^XU030': 'BIST-30',
  '^GSPC': 'S&P 500', '^IXIC': 'NASDAQ', '^DJI': 'Dow Jones',
  '^FTSE': 'FTSE 100', '^GDAXI': 'DAX',
  // BIST Stocks
  'THYAO.IS': 'THYAO', 'ASELS.IS': 'ASELS', 'GARAN.IS': 'GARAN',
  'SISE.IS': 'SISE', 'EREGL.IS': 'EREGL', 'BIMAS.IS': 'BIMAS',
  // Commodities
  'GC=F': 'Altin (Ons)', 'SI=F': 'Gumus',
  'CL=F': 'Petrol (WTI)', 'NG=F': 'Dogalgaz',
  // Forex
  'USDTRY=X': 'USD/TRY', 'EURTRY=X': 'EUR/TRY',
  'GBPTRY=X': 'GBP/TRY', 'EURUSD=X': 'EUR/USD',
  // Crypto
  'BTC-USD': 'Bitcoin', 'ETH-USD': 'Ethereum',
  'SOL-USD': 'Solana', 'XRP-USD': 'XRP',
  'BNB-USD': 'BNB', 'ADA-USD': 'Cardano',
  'DOGE-USD': 'Dogecoin', 'DOT-USD': 'Polkadot',
  // Portfolio
  'GAU.IS': 'Gram Altin',
};

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), 8000);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        clearTimeout(timeout);
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON')); }
      });
    }).on('error', (e) => { clearTimeout(timeout); reject(e); });
  });
}

async function fetchYahoo(sym) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`;
    const data = await fetchJSON(url);
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

async function fetchAll() {
  const syms = Object.keys(SYMBOLS);
  const results = {};
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
  return results;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60, s-maxage=300',
  };
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  try {
    const prices = await fetchAll();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        prices,
        count: Object.keys(prices).length,
        total: Object.keys(SYMBOLS).length,
        timestamp: Date.now(),
      }),
    };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
