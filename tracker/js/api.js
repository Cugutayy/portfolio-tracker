let livePrices = {};
let lastFetchTime = null;
let countdownSec = 900;
let usdTryRate = 43.85; // Updated during fetch
let mainChart = null;
let curChartTab = 'portfolio';

// ════════════════════════════════════════════════════════════════
// FETCH HELPERS
// ════════════════════════════════════════════════════════════════
async function safeGet(url, timeout=15000, retries=1) {
  for(let attempt=0; attempt<=retries; attempt++){
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!r.ok) throw new Error(`HTTP ${r.status} (${r.statusText})`);
      return await r.json();
    } catch(e) {
      clearTimeout(timer);
      if(attempt < retries){
        console.log(`[safeGet] Retry ${attempt+1}/${retries}: ${url.slice(0,60)}...`);
        await new Promise(r=>setTimeout(r,500));
        continue;
      }
      if (e.name === 'AbortError') throw new Error('Timeout (15s)');
      if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError'))
        throw new Error('Network error — CORS or connectivity issue');
      if (e.message.includes('451')) throw new Error('Region blocked');
      throw e;
    }
  }
}

function yahooProxy(symbol) {
  // Use Cloudflare Pages Function (or Netlify) when deployed, allorigins for local dev
  if(window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'){
    return `/api/prices?sym=${encodeURIComponent(symbol)}`;
  }
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
}

// ════════════════════════════════════════════════════════════════
// FETCH ALL PRICES
// ════════════════════════════════════════════════════════════════
async function fetchAllPrices() {
  const btn = document.getElementById('fetchBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-dash"></span>' + (LANG==='tr'?'Çekiliyor':'Fetching');

  const log = [];
  const setLog = () => {
    document.getElementById('fetchLogDiv').innerHTML = log.map(l =>
      `<div class="${l.status}">${l.icon} <strong>${l.label}:</strong> ${l.val}</div>`
    ).join('');
  };

  const now = new Date();
  const hour = now.getHours(), day = now.getDay();
  const bistOpen = day >= 1 && day <= 5 && hour >= 10 && hour < 18;
  const bistNote = bistOpen ? '' : (LANG==='tr'?' (BIST kapalı — son kapanış)':' (BIST closed — last close)');

  let usdTry = usdTryRate; // Start with last known rate

  // ── 1) BTC/TRY — CoinGecko → Binance ──
  log.push({status:'loading',icon:'⏳',label:'BTC/TRY',val:t('fetching')});
  setLog();
  let btcOk = false;
  try {
    const data = await safeGet('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=try,usd');
    if (data?.bitcoin?.try) {
      livePrices.btc = { price: Math.round(data.bitcoin.try), src: 'CoinGecko' };
      usdTry = data.bitcoin.try / data.bitcoin.usd;
      log[log.length-1] = {status:'ok',icon:'✓',label:'BTC/TRY',val:`${fmt(data.bitcoin.try,0)} TL — CoinGecko`};
      btcOk = true;
    } else throw new Error('empty');
  } catch(e1) {
    try {
      const [btcD, tryD] = await Promise.all([
        safeGet('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT'),
        safeGet('https://api.binance.com/api/v3/ticker/price?symbol=USDTTRY')
      ]);
      usdTry = parseFloat(tryD.price);
      const btcTry = parseFloat(btcD.price) * usdTry;
      livePrices.btc = { price: Math.round(btcTry), src: 'Binance' };
      log[log.length-1] = {status:'ok',icon:'✓',label:'BTC/TRY',val:`${fmt(btcTry,0)} TL — Binance`};
      btcOk = true;
    } catch(e2) {
      log[log.length-1] = {status:'err',icon:'✗',label:'BTC/TRY',val:`${t('fetchFail')}: ${t('cryptoFail')}`};
    }
  }
  setLog();

  // ── 2) USD/TRY ──
  if (usdTry < 30 || usdTry > 100) {
    try { const d = await safeGet('https://api.binance.com/api/v3/ticker/price?symbol=USDTTRY'); usdTry = parseFloat(d.price); } catch(e) { usdTry = 43.85; }
  }

  // ── 3) Gram Altın — Truncgil → Yahoo ──
  log.push({status:'loading',icon:'⏳',label:LANG==='tr'?'Gram Altın':'Gold',val:t('fetching')});
  setLog();
  try {
    const data = await safeGet('https://finans.truncgil.com/v4/today.json');
    const gramAltin = data?.['gram-altin'] || data?.['Gram Altın'];
    if (gramAltin) {
      const raw = gramAltin.Piyet || gramAltin.Satış || gramAltin.Alış || '';
      const price = parseFloat(String(raw).replace(/\./g,'').replace(',','.')) || 0;
      if (price > 1000) { livePrices.gold = { price, src: 'Truncgil Finans' }; log[log.length-1] = {status:'ok',icon:'✓',label:LANG==='tr'?'Gram Altın':'Gold',val:`${fmt(price,0)} TL — Truncgil`}; }
      else throw new Error('invalid');
    } else throw new Error('missing');
  } catch(e1) {
    try {
      const data = await safeGet(yahooProxy('GC=F'));
      const goldUsd = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (goldUsd > 0) { const goldTry=(goldUsd/31.1035)*usdTry; livePrices.gold={price:Math.round(goldTry),src:'Yahoo'}; log[log.length-1]={status:'ok',icon:'✓',label:LANG==='tr'?'Gram Altın':'Gold',val:`${fmt(goldTry,0)} TL — Yahoo`}; }
      else throw new Error('missing');
    } catch(e2) { log[log.length-1] = {status:'err',icon:'✗',label:LANG==='tr'?'Gram Altın':'Gold',val:`${t('fetchFail')}: ${t('goldFail')}`}; }
  }
  setLog();

  // ── 4) THYAO ──
  log.push({status:'loading',icon:'⏳',label:'THYAO',val:t('fetching')});
  setLog();
  try {
    const data = await safeGet(yahooProxy('THYAO.IS'));
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (price > 0) { livePrices.thyao={price,src:'Yahoo Finance'}; log[log.length-1]={status:'ok',icon:'✓',label:'THYAO',val:`${fmt(price,2)} TL — Yahoo${bistNote}`}; }
    else throw new Error('empty');
  } catch(e) {
    log[log.length-1] = {status:'err',icon:'✗',label:'THYAO',val:`${t('fetchFail')}: ${bistOpen?t('proxyFail'):t('bistClosed')}`};
  }
  setLog();
  await sleep(300);

  // ── 5) ASELS ──
  log.push({status:'loading',icon:'⏳',label:'ASELS',val:t('fetching')});
  setLog();
  try {
    const data = await safeGet(yahooProxy('ASELS.IS'));
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (price > 0) { livePrices.asels={price,src:'Yahoo Finance'}; log[log.length-1]={status:'ok',icon:'✓',label:'ASELS',val:`${fmt(price,2)} TL — Yahoo${bistNote}`}; }
    else throw new Error('empty');
  } catch(e) {
    log[log.length-1] = {status:'err',icon:'✗',label:'ASELS',val:`${t('fetchFail')}: ${bistOpen?t('proxyFail'):t('bistClosed')}`};
  }
  setLog();

  // ── 6-8) Bond, Fund, Deposit — HISTORY only ──
  log.push({status:'ok',icon:'◆',label:'DİBS 2Y',val:`${fmt(getLatestPrice('bond'),2)} — ${t('lastClose')}`});
  log.push({status:'ok',icon:'◆',label:'BIO Fon',val:`${fmt(getLatestPrice('fund'),4)} TL — ${t('lastClose')}`});
  log.push({status:'ok',icon:'◆',label:LANG==='tr'?'Mevduat':'Deposit',val:`${fmt(getLatestPrice('dep'),0)} TL — ${t('lastValue')}`});
  setLog();

  // Update UI
  // Save USD/TRY rate for currency display
  usdTryRate = usdTry;
  lastFetchTime = new Date();
  countdownSec = 900;

  // ── AUTO-INJECT: push today's live prices into HISTORY ──
  injectTodayToHistory();

  document.getElementById('lastUpd').textContent = lastFetchTime.toLocaleTimeString('tr-TR');
  const ftu = document.getElementById('footerUpdateTime');
  if(ftu) ftu.textContent = lastFetchTime.toLocaleTimeString('tr-TR');
  document.getElementById('srcStatus').textContent = lastFetchTime.toLocaleTimeString('tr-TR');

  const apiOk = ['btc','thyao','asels','gold'].filter(id => livePrices[id]?.src).length;
  const dot = document.getElementById('statusDot');
  dot.className = apiOk >= 3 ? 'status-dot live' : apiOk >= 1 ? 'status-dot stale' : 'status-dot off';

  renderAll();
  showToast(`${apiOk} ${t('liveUpdated')} — ${t('bondFundDep')}`);

  btn.disabled = false;
  btn.innerHTML = `<span data-i18n="updatePrices">${t('updatePrices')}</span>`;
}

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════
const sleep = ms => new Promise(r => setTimeout(r, ms));
function todayStr() { return new Date().toISOString().slice(0,10); }

// ── HISTORY VERIFY: Binance klines API'den geçmiş BTC fiyatlarını doğrula/düzelt ──
async function verifyHistoryFromAPI(){
  try {
    // Son 30 günün BTC/USDT günlük kapanış fiyatlarını çek
    const now = Date.now();
    const from = now - 35 * 86400000; // 35 gün geriye
    const [btcData, tryData] = await Promise.all([
      safeGet(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&startTime=${from}&endTime=${now}&limit=35`),
      safeGet('https://api.binance.com/api/v3/ticker/price?symbol=USDTTRY')
    ]);
    const usdtTry = parseFloat(tryData.price);
    if(!Array.isArray(btcData) || btcData.length === 0 || !usdtTry) return;

    // Her kline'dan tarih → kapanış fiyatı (USD) haritala
    const btcDailyUsd = {};
    btcData.forEach(k => {
      const d = new Date(k[0]).toISOString().slice(0,10);
      btcDailyUsd[d] = parseFloat(k[4]); // close price
    });

    // HISTORY'deki her tarihi kontrol et
    let fixes = 0;
    HISTORY.dates.forEach((date, i) => {
      const btcUsd = btcDailyUsd[date];
      if(!btcUsd) return; // API'de bu tarih yok, atla

      const apiBtcTry = Math.round(btcUsd * usdtTry);
      const histBtcTry = HISTORY.btc[i];
      const diff = Math.abs(apiBtcTry - histBtcTry) / apiBtcTry;

      // %10'dan fazla fark varsa düzelt
      if(diff > 0.10){
        console.warn(`[HISTORY VERIFY] ${date}: BTC düzeltildi ${histBtcTry.toLocaleString()} → ${apiBtcTry.toLocaleString()} (API: ${btcUsd.toFixed(0)} × ${usdtTry.toFixed(2)})`);
        HISTORY.btc[i] = apiBtcTry;
        fixes++;
      }
    });

    if(fixes > 0){
      console.log(`[HISTORY VERIFY] ${fixes} BTC fiyatı API'den düzeltildi`);
      renderAll();
    } else {
      console.log('[HISTORY VERIFY] Tüm BTC fiyatları doğru (±10% tolerans)');
    }
  } catch(e){
    console.warn('[HISTORY VERIFY] API doğrulama başarısız (normal olabilir):', e.message);
  }
}

// ════════════════════════════════════════════════════════════════
// FURKAN PORTFOLIO — Fetch ALL prices from real APIs
// BTC: Binance klines, Stocks: Yahoo Finance, Gold: Yahoo GC=F,
// Funds: TEFAS API, Deposit: calculated from interest rate
// ════════════════════════════════════════════════════════════════

function yahooHistProxy(symbol, period1, period2) {
  if(window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'){
    return `/api/prices?sym=${encodeURIComponent(symbol)}&period1=${period1}&period2=${period2}&interval=1d`;
  }
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d`;
  return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
}

// TEFAS fetch — tries direct POST first, then Cloudflare proxy, then allorigins
async function fetchTefasData(fonKod, startDate, endDate) {
  const body = `fonKod=${encodeURIComponent(fonKod)}&baslangicTarihi=${encodeURIComponent(startDate)}&bitisTarihi=${encodeURIComponent(endDate)}`;

  // 1) Production: use Cloudflare Pages function
  if(window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'){
    const r = await fetch(`/api/tefas?fonKod=${encodeURIComponent(fonKod)}&start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`);
    if(!r.ok) throw new Error(`TEFAS proxy ${r.status}`);
    return await r.json();
  }

  // 2) Local dev: try direct POST (TEFAS may allow CORS)
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    const r = await fetch('https://www.tefas.gov.tr/api/DB/BindHistoryInfo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: ctrl.signal
    });
    clearTimeout(timer);
    if(r.ok) return await r.json();
  } catch(e) {
    console.log('[TEFAS] Direct POST failed (CORS expected):', e.message);
  }

  // 3) Fallback: allorigins with encoded URL
  const tefasUrl = `https://www.tefas.gov.tr/api/DB/BindHistoryInfo?fonKod=${fonKod}&baslangicTarihi=${startDate}&bitisTarihi=${endDate}`;
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(tefasUrl)}`;
  const r2 = await fetch(proxyUrl, { signal: AbortSignal.timeout(20000) });
  if(!r2.ok) throw new Error(`Allorigins ${r2.status}`);
  const text = await r2.text();
  // Validate it's JSON before parsing
  if(!text || text.trim()[0] !== '[' && text.trim()[0] !== '{') throw new Error('TEFAS: Non-JSON response (likely HTML page)');
  return JSON.parse(text);
}

// Parse Yahoo Finance chart response into { dates, prices }
function parseYahooHistorical(data, startDateStr) {
  const result = data?.chart?.result?.[0];
  if(!result) return null;
  const timestamps = result.timestamp;
  const closes = result.indicators?.quote?.[0]?.close;
  if(!timestamps || !closes) return null;

  const dates = [], prices = [];
  for(let i = 0; i < timestamps.length; i++){
    const d = new Date(timestamps[i] * 1000);
    const dateStr = d.toISOString().slice(0,10);
    if(dateStr < startDateStr) continue;
    if(closes[i] === null || closes[i] === undefined) continue;
    // Deduplicate
    if(dates.length > 0 && dates[dates.length-1] === dateStr) continue;
    dates.push(dateStr);
    prices.push(closes[i]);
  }
  return dates.length > 0 ? { dates, prices } : null;
}

// Parse TEFAS API response into { dates, prices }
function parseTefasResponse(data, startDateStr) {
  if(!data) return null;
  let items = Array.isArray(data) ? data : (data.data || data);
  if(!Array.isArray(items) || items.length === 0) return null;

  // Sort by date ascending
  const sorted = [...items].sort((a, b) => {
    const da = a.TARIH || a.tarih || '';
    const db = b.TARIH || b.tarih || '';
    return da.localeCompare(db);
  });

  const dates = [], prices = [];
  sorted.forEach(item => {
    let dateStr = item.TARIH || item.tarih || '';
    // Handle "17.02.2026" format
    if(dateStr.includes('.') && !dateStr.includes('T')) {
      const parts = dateStr.split('.');
      if(parts.length === 3) dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    // Handle "2026-02-17T00:00:00" format
    if(dateStr.includes('T')) dateStr = dateStr.split('T')[0];
    if(dateStr < startDateStr) return;

    const price = parseFloat(item.FIYAT || item.fiyat || item.BirimPayDegeri || 0);
    if(price > 0){
      // Deduplicate
      if(dates.length > 0 && dates[dates.length-1] === dateStr) return;
      dates.push(dateStr);
      prices.push(+price.toFixed(6));
    }
  });
  return dates.length > 0 ? { dates, prices } : null;
}

// ── MAIN FETCH: Get all Furkan historical prices from APIs ──
let furkanFetchInProgress = false;
let furkanLastFetch = null;

async function fetchFurkanHistoricalPrices(progressCb) {
  if(furkanFetchInProgress) return null;
  furkanFetchInProgress = true;

  const START = FURKAN_START_DATE; // '2026-02-17'
  const startTs = Math.floor(new Date(START + 'T00:00:00').getTime() / 1000);
  const endTs = Math.floor(Date.now() / 1000);

  // TEFAS date format: dd.MM.yyyy
  const tefasStart = '17.02.2026';
  const now = new Date();
  const tefasEnd = `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()}`;

  const results = {};
  const fetchLog = [];
  const report = (msg) => {
    fetchLog.push(msg);
    if(progressCb) progressCb(msg, fetchLog);
    console.log('[FURKAN]', msg);
  };

  report('Furkan portfoy verileri API\'lerden paralel cekiliyor...');

  const fromMs = new Date(START).getTime();
  const nowMs = Date.now();

  // ═══ ALL 6 INSTRUMENTS FETCHED IN PARALLEL ═══
  const fetchBTC = async () => {
    report('  BTC/TRY cekiliyor (Binance)...');
    const [btcData, tryData] = await Promise.all([
      safeGet(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&startTime=${fromMs}&endTime=${nowMs}&limit=30`),
      safeGet('https://api.binance.com/api/v3/ticker/price?symbol=USDTTRY')
    ]);
    const usdtTry = parseFloat(tryData.price);
    if(!Array.isArray(btcData) || btcData.length === 0 || !usdtTry) throw new Error('Empty Binance response');
    const dates = [], prices = [];
    btcData.forEach(k => {
      const d = new Date(k[0]).toISOString().slice(0,10);
      if(d >= START){ dates.push(d); prices.push(Math.round(parseFloat(k[4]) * usdtTry)); }
    });
    return { id: 'f_btc', dates, prices, src: 'Binance klines + USDT/TRY' };
  };

  const fetchYahooStock = async (sym, id) => {
    report(`  ${sym} cekiliyor (Yahoo Finance)...`);
    const data = await safeGet(yahooHistProxy(sym, startTs, endTs), 15000, 1);
    const parsed = parseYahooHistorical(data, START);
    if(!parsed || parsed.dates.length === 0) throw new Error(`No ${sym} data from Yahoo`);
    return { id, dates: parsed.dates, prices: parsed.prices.map(p => +p.toFixed(2)), src: 'Yahoo Finance' };
  };

  const fetchGold = async () => {
    report('  Gram Altin cekiliyor (Yahoo GC=F + USD/TRY)...');
    const [goldData, usdTryData] = await Promise.all([
      safeGet(yahooHistProxy('GC=F', startTs, endTs), 15000, 1),
      safeGet(yahooHistProxy('USDTRY=X', startTs, endTs), 15000, 1)
    ]);
    const goldParsed = parseYahooHistorical(goldData, START);
    const usdTryParsed = parseYahooHistorical(usdTryData, START);
    if(!goldParsed || goldParsed.dates.length === 0) throw new Error('No gold data');
    const usdTryMap = {};
    if(usdTryParsed) usdTryParsed.dates.forEach((d,i) => { usdTryMap[d] = usdTryParsed.prices[i]; });
    const goldDates = [], goldPrices = [];
    goldParsed.dates.forEach((d, i) => {
      const rate = usdTryMap[d] || usdTryRate;
      goldDates.push(d);
      goldPrices.push(Math.round((goldParsed.prices[i] / 31.1035) * rate));
    });
    return { id: 'f_altin', dates: goldDates, prices: goldPrices, src: 'Yahoo (GC=F * USD/TRY / 31.1035)' };
  };

  const fetchFund = async (fonKod, id) => {
    report(`  ${fonKod} fon fiyati cekiliyor (TEFAS)...`);
    // Try TEFAS API first
    try {
      const data = await fetchTefasData(fonKod, tefasStart, tefasEnd);
      const parsed = parseTefasResponse(data, START);
      if(parsed && parsed.dates.length > 0) {
        return { id, dates: parsed.dates, prices: parsed.prices, src: 'TEFAS API' };
      }
    } catch(e) {
      report(`  ⚠ ${fonKod} TEFAS API hata: ${e.message}`);
    }
    // Fallback: use hardcoded TEFAS data (verified from tefas.gov.tr)
    if(typeof TEFAS_FALLBACK !== 'undefined' && TEFAS_FALLBACK[fonKod]) {
      const fb = TEFAS_FALLBACK[fonKod];
      report(`  ↳ ${fonKod} fallback verisi kullaniliyor (${fb.dates.length} gun)`);
      return { id, dates: [...fb.dates], prices: [...fb.prices], src: 'TEFAS fallback (verified)' };
    }
    throw new Error(`No ${fonKod} data from TEFAS or fallback`);
  };

  // Fire all 6 requests simultaneously
  const settled = await Promise.allSettled([
    fetchBTC(),
    fetchYahooStock('EREGL.IS', 'f_eregl'),
    fetchYahooStock('ARCLK.IS', 'f_arclk'),
    fetchGold(),
    fetchFund('TZT', 'f_tzt'),
    fetchFund('PHE', 'f_phe'),
  ]);

  // Process results
  const labels = ['BTC/TRY','EREGL.IS','ARCLK.IS','Gram Altin','TZT','PHE'];
  settled.forEach((s, i) => {
    if(s.status === 'fulfilled'){
      const r = s.value;
      results[r.id] = r;
      const lastP = r.prices[r.prices.length-1];
      const fmtP = r.id === 'f_btc' ? lastP?.toLocaleString() : r.id.includes('f_t') || r.id.includes('f_p') ? lastP?.toFixed(4) : lastP?.toFixed?.(2) || lastP;
      report(`  ✓ ${labels[i]}: ${r.dates.length} gun — son: ${fmtP} TL — ${r.src}`);
    } else {
      report(`  ✗ ${labels[i]} HATA: ${s.reason?.message || s.reason}`);
    }
  });

  // Gold fallback: use main portfolio HISTORY if Yahoo failed
  if(!results.f_altin && HISTORY?.gold?.length > 0 && HISTORY?.dates?.length > 0){
    const gd = [], gp = [];
    HISTORY.dates.forEach((d, i) => { if(d >= START && HISTORY.gold[i]){ gd.push(d); gp.push(HISTORY.gold[i]); }});
    if(gd.length > 0){
      results.f_altin = { dates: gd, prices: gp, src: 'Ana portfolio HISTORY (fallback)' };
      report(`  ⚠ Gram Altin: Yahoo hata — ana portfolio verisi kullaniliyor (${gd.length} gun)`);
    }
  }

  // ════════════════════════════════════════════════════════
  // BUILD FURKAN_HISTORY from fetched results
  // ════════════════════════════════════════════════════════
  report('Veriler birlestiriliyor...');

  // Collect all unique weekday dates
  const allDates = new Set();
  Object.values(results).forEach(r => r.dates.forEach(d => allDates.add(d)));
  // Also ensure all weekdays from START to today are included
  const startDt = new Date(START);
  const endDt = new Date();
  for(let d = new Date(startDt); d <= endDt; d = new Date(d.getTime() + 86400000)){
    const dow = d.getDay();
    if(dow !== 0 && dow !== 6) allDates.add(d.toISOString().slice(0,10));
  }
  const sortedDates = [...allDates].sort();

  // Build price arrays with forward-fill for missing dates
  const history = { dates: sortedDates };
  FURKAN_INSTRS.forEach(ins => {
    const r = results[ins.id];

    if(ins.id === 'f_dep'){
      // Deposit: calculate from 38% gross annual rate, 15% withholding tax
      const arr = [];
      sortedDates.forEach((d, i) => {
        if(i === 0){ arr.push(ins.alloc); return; }
        const dayCount = Math.round((new Date(d) - new Date(sortedDates[i-1])) / 86400000);
        const dailyNetRate = (0.38 / 365) * 0.85; // brut * (1 - stopaj)
        arr.push(+(arr[i-1] + ins.alloc * dailyNetRate * dayCount).toFixed(2));
      });
      history[ins.id] = arr;
      return;
    }

    if(!r || r.dates.length === 0){
      // No data: fill with nulls
      history[ins.id] = sortedDates.map(() => null);
      return;
    }

    // Build date→price lookup
    const priceMap = {};
    r.dates.forEach((d, i) => { priceMap[d] = r.prices[i]; });

    // Fill with forward-fill (carry last known price)
    const arr = [];
    let lastPrice = null;
    sortedDates.forEach(d => {
      if(priceMap[d] !== undefined) lastPrice = priceMap[d];
      arr.push(lastPrice);
    });
    history[ins.id] = arr;

    // Set buyPrice = first available price
    if(arr[0] !== null) ins.buyPrice = arr[0];
  });

  // Write to FURKAN_HISTORY
  FURKAN_HISTORY.dates = history.dates;
  FURKAN_INSTRS.forEach(ins => {
    if(history[ins.id]) FURKAN_HISTORY[ins.id] = history[ins.id];
  });

  // ════════════════════════════════════════════════════════
  // 3x VERIFICATION
  // ════════════════════════════════════════════════════════
  report('\n=== DOGRULAMA (3x Kontrol) ===');

  // CHECK 1: Data integrity
  report('Kontrol 1/3: Veri butunlugu...');
  let integrityOk = true;
  FURKAN_INSTRS.forEach(ins => {
    const arr = FURKAN_HISTORY[ins.id];
    if(!arr){ report(`  ✗ ${ins.id}: Veri yok!`); integrityOk = false; return; }
    if(arr.length !== sortedDates.length){ report(`  ✗ ${ins.id}: Uzunluk uyusmazligi (${arr.length} vs ${sortedDates.length})`); integrityOk = false; return; }
    const nullCount = arr.filter(v => v === null).length;
    const zeroCount = arr.filter(v => v === 0).length;
    const negCount = arr.filter(v => v !== null && v < 0).length;
    if(ins.id !== 'f_dep' && nullCount > 0) report(`  ⚠ ${ins.id}: ${nullCount} null deger`);
    if(zeroCount > 0) report(`  ✗ ${ins.id}: ${zeroCount} sifir deger!`);
    if(negCount > 0){ report(`  ✗ ${ins.id}: ${negCount} negatif deger!`); integrityOk = false; }
    if(nullCount === 0 && zeroCount === 0 && negCount === 0) report(`  ✓ ${ins.id}: ${arr.length} gun, tum degerler gecerli`);
  });

  // CHECK 2: Cross-source verification (all in parallel)
  report('Kontrol 2/3: Capraz kaynak dogrulama...');
  const crossChecks = await Promise.allSettled([
    safeGet('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=try', 8000),
    safeGet(yahooProxy('EREGL.IS'), 8000),
    safeGet(yahooProxy('ARCLK.IS'), 8000),
  ]);

  // BTC cross-check
  if(crossChecks[0].status === 'fulfilled'){
    const cgPrice = crossChecks[0].value?.bitcoin?.try;
    const binanceLatest = results.f_btc?.prices?.[results.f_btc.prices.length-1];
    if(cgPrice && binanceLatest){
      const diff = Math.abs(cgPrice - binanceLatest) / cgPrice * 100;
      report(`  BTC: Binance=${binanceLatest.toLocaleString()} TL, CoinGecko=${Math.round(cgPrice).toLocaleString()} TL (fark: %${diff.toFixed(1)})`);
      report(diff > 10 ? `  ⚠ BTC >%10 fark!` : `  ✓ BTC tutarli`);
    }
  } else { report(`  ⚠ CoinGecko dogrulama hatasi: ${crossChecks[0].reason?.message}`); }

  // Stock cross-checks
  ['EREGL.IS','ARCLK.IS'].forEach((sym, idx) => {
    const insId = sym === 'EREGL.IS' ? 'f_eregl' : 'f_arclk';
    const check = crossChecks[idx + 1];
    if(check.status === 'fulfilled'){
      const spotPrice = check.value?.chart?.result?.[0]?.meta?.regularMarketPrice;
      const histLatest = results[insId]?.prices?.[results[insId].prices.length-1];
      if(spotPrice && histLatest){
        const diff = Math.abs(spotPrice - histLatest) / spotPrice * 100;
        report(`  ${sym}: Tarihsel=${histLatest.toFixed(2)}, Spot=${spotPrice.toFixed(2)} (fark: %${diff.toFixed(1)})`);
        report(diff > 15 ? `  ⚠ ${sym} >%15 fark` : `  ✓ ${sym} tutarli`);
      }
    } else { report(`  ⚠ ${sym} spot dogrulama hatasi`); }
  });

  // CHECK 3: Reasonableness (no extreme daily swings)
  report('Kontrol 3/3: Mantiklilik kontrolu...');
  FURKAN_INSTRS.forEach(ins => {
    const arr = FURKAN_HISTORY[ins.id];
    if(!arr || ins.id === 'f_dep') return;
    const maxSwing = ins.id === 'f_btc' ? 0.30 : 0.20; // 30% crypto, 20% stocks/funds
    let extremes = 0;
    for(let i = 1; i < arr.length; i++){
      if(arr[i] === null || arr[i-1] === null || arr[i-1] === 0) continue;
      const change = Math.abs(arr[i] - arr[i-1]) / arr[i-1];
      if(change > maxSwing){
        report(`  ⚠ ${ins.id}: ${sortedDates[i]} gunluk degisim %${(change*100).toFixed(1)} (>%${maxSwing*100} limit)`);
        extremes++;
      }
    }
    if(extremes === 0) report(`  ✓ ${ins.id}: Gunluk degisimler normal aralikta`);
  });

  const successIds = Object.keys(results);
  const totalInstr = FURKAN_INSTRS.filter(i => i.id !== 'f_dep').length;
  report(`\n=== SONUC: ${successIds.length}/${totalInstr} enstruman API'den cekildi ===`);

  // Log data sources for transparency
  report('\nVeri Kaynaklari:');
  FURKAN_INSTRS.forEach(ins => {
    const r = results[ins.id];
    if(r) report(`  ${ins.name}: ${r.src}`);
    else if(ins.id === 'f_dep') report(`  ${ins.name}: Hesaplanan (%38 yillik, %15 stopaj)`);
    else report(`  ${ins.name}: VERI ALINAMADI`);
  });

  furkanFetchInProgress = false;
  furkanLastFetch = Date.now();
  return { results, fetchLog, success: successIds.length, total: totalInstr };
}

// ── AUTO-INJECT: Add/update today's date in HISTORY from live prices ──
function injectTodayToHistory(){
  const today = todayStr();
  const lastDate = HISTORY.dates[HISTORY.dates.length - 1];

  // If today is already the last date, update ONLY with fresh live prices
  if(today === lastDate){
    INSTRS.forEach(ins => {
      if(ins.id === 'dep' || ins.id === 'bond' || ins.id === 'fund') return; // calculated, not fetched
      const lp = livePrices[ins.id]?.price;
      if(lp && lp > 0) {
        // Sanity check: live price should be within 50% of previous day
        const idx = HISTORY[ins.id].length - 1;
        const prevPrice = idx > 0 ? HISTORY[ins.id][idx - 1] : lp;
        const ratio = lp / prevPrice;
        if(ratio > 0.5 && ratio < 2.0) {
          HISTORY[ins.id][idx] = lp;
        } else {
          console.warn(`[HISTORY] Rejected suspicious live price for ${ins.id}: ${lp} (prev: ${prevPrice}, ratio: ${ratio.toFixed(2)})`);
        }
      }
    });
    if(HISTORY.xu100 && livePrices.xu100?.price) HISTORY.xu100[HISTORY.xu100.length-1]=livePrices.xu100.price;
    console.log('[HISTORY] Updated today:', today, 'with live prices');
    return;
  }

  // Fill ALL missing weekdays between lastDate and today
  if(today > lastDate){
    const start = new Date(lastDate);
    const end = new Date(today);
    const oneDay = 86400000;
    for(let d = new Date(start.getTime() + oneDay); d <= end; d = new Date(d.getTime() + oneDay)){
      const dow = d.getDay();
      if(dow === 0 || dow === 6) continue; // skip weekends
      const dateStr = d.toISOString().slice(0,10);
      if(HISTORY.dates.includes(dateStr)) continue;

      HISTORY.dates.push(dateStr);
      INSTRS.forEach(ins => {
        const arr = HISTORY[ins.id];
        const lastVal = arr[arr.length - 1];
        if(ins.id === 'dep'){
          // Simple interest + 15% stopaj (Turkish vadeli mevduat)
          const dailyNetRate = (0.355 / 365) * 0.85; // brut daily * (1 - 0.15 stopaj)
          arr.push(+(lastVal + 10000 * dailyNetRate).toFixed(2));
        } else if(ins.id === 'bond'){
          arr.push(+(lastVal + 100 * 0.30 / 365).toFixed(2));
        } else {
          // Only use live price for TODAY, carry-forward for past missing days
          const lp = (dateStr === today) ? livePrices[ins.id]?.price : null;
          if(lp && lp > 0){
            // Sanity check
            const ratio = lp / lastVal;
            arr.push((ratio > 0.5 && ratio < 2.0) ? lp : lastVal);
          } else {
            arr.push(lastVal);
          }
        }
      });
      // Carry forward BIST-100 benchmark
      if(HISTORY.xu100){HISTORY.xu100.push(HISTORY.xu100[HISTORY.xu100.length-1]);}
      console.log('[HISTORY] Filled missing day:', dateStr);
    }
  }
}
