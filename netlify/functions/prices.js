// Netlify Function: Yahoo Finance API Proxy
// Eliminates CORS issues — server-side fetch
exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60'
  };
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  const sym = event.queryStringParameters?.sym;
  if (!sym || !/^[A-Za-z0-9\.\-\=\^]+$/.test(sym)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid symbol' }) };
  }
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=1d`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    if (!response.ok) {
      return { statusCode: response.status, headers, body: JSON.stringify({ error: `Yahoo ${response.status}` }) };
    }
    const data = await response.json();
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
