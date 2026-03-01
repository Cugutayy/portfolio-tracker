let livePrices = {};
let lastFetchTime = null;
let countdownSec = 900;
let usdTryRate = 43.85; // Updated during fetch
let mainChart = null;
let curChartTab = 'portfolio';

// ════════════════════════════════════════════════════════════════
// FETCH HELPERS
// ════════════════════════════════════════════════════════════════
async function safeGet(url, timeout=12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) throw new Error(`HTTP ${r.status} (${r.statusText})`);
    return await r.json();
  } catch(e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') throw new Error('Timeout (12s)');
    if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError'))
      throw new Error('Network error — CORS or connectivity issue');
    if (e.message.includes('451')) throw new Error('Region blocked');
    throw e;
  }
}

function yahooProxy(symbol) {
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

// ── AUTO-INJECT: Add/update today's date in HISTORY from live prices ──
function injectTodayToHistory(){
  const today = todayStr();
  const lastDate = HISTORY.dates[HISTORY.dates.length - 1];

  // If today is already the last date, update with any live prices we have
  if(today === lastDate){
    INSTRS.forEach(ins => {
      if(ins.id === 'dep' || ins.id === 'bond') return; // these are calculated, not fetched
      const lp = livePrices[ins.id]?.price;
      if(lp) HISTORY[ins.id][HISTORY[ins.id].length - 1] = lp;
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
        } else if(ins.id === 'fund'){
          const lp = livePrices.fund?.price;
          arr.push(lp || lastVal);
        } else {
          const lp = (dateStr === today) ? livePrices[ins.id]?.price : null;
          arr.push(lp || lastVal);
        }
      });
      // Carry forward BIST-100 benchmark
      if(HISTORY.xu100){HISTORY.xu100.push(HISTORY.xu100[HISTORY.xu100.length-1]);}
      console.log('[HISTORY] Filled missing day:', dateStr);
    }
  }
}
