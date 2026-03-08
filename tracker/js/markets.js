const MARKET_ITEMS = {
  indices: [
    {sym:'XU100.IS',name:'BIST-100',link:'https://www.investing.com/indices/ise-100'},
    {sym:'XU030.IS',name:'BIST-30',link:'https://www.investing.com/indices/ise-30'},
    {sym:'^GSPC',name:'S&P 500',link:'https://www.investing.com/indices/us-spx-500'},
    {sym:'^IXIC',name:'NASDAQ',link:'https://www.investing.com/indices/nasdaq-composite'},
    {sym:'^DJI',name:'Dow Jones',link:'https://www.investing.com/indices/us-30'},
    {sym:'^FTSE',name:'FTSE 100',link:'https://www.investing.com/indices/uk-100'},
    {sym:'^GDAXI',name:'DAX',link:'https://www.investing.com/indices/germany-30'},
  ],
  stocks: [
    {sym:'THYAO.IS',name:'THYAO',link:'https://www.investing.com/equities/turk-hava-yollari'},
    {sym:'ASELS.IS',name:'ASELS',link:'https://www.investing.com/equities/aselsan'},
    {sym:'GARAN.IS',name:'GARAN',link:'https://www.investing.com/equities/garanti-bankasi'},
    {sym:'AKBNK.IS',name:'AKBNK',link:'https://www.investing.com/equities/akbank'},
    {sym:'YKBNK.IS',name:'YKBNK',link:'https://www.investing.com/equities/yapi-ve-kredi-bankasi'},
    {sym:'ISCTR.IS',name:'ISCTR',link:'https://www.investing.com/equities/turkiye-is-bankasi-c'},
    {sym:'HALKB.IS',name:'HALKB',link:'https://www.investing.com/equities/turkiye-halk-bankasi'},
    {sym:'VAKBN.IS',name:'VAKBN',link:'https://www.investing.com/equities/turkiye-vakiflar-bankasi'},
    {sym:'KCHOL.IS',name:'KCHOL',link:'https://www.investing.com/equities/koc-holding'},
    {sym:'SAHOL.IS',name:'SAHOL',link:'https://www.investing.com/equities/haci-omer-sabanci-holding'},
    {sym:'TUPRS.IS',name:'TUPRS',link:'https://www.investing.com/equities/tupras-turkiye-petrol-rafine'},
    {sym:'SISE.IS',name:'SISE',link:'https://www.investing.com/equities/sise-cam'},
    {sym:'EREGL.IS',name:'EREGL',link:'https://www.investing.com/equities/eregli-demir-celik'},
    {sym:'BIMAS.IS',name:'BIMAS',link:'https://www.investing.com/equities/bim-birlesik-magazalar'},
    {sym:'FROTO.IS',name:'FROTO',link:'https://www.investing.com/equities/ford-otomotiv-sanayi'},
    {sym:'TOASO.IS',name:'TOASO',link:'https://www.investing.com/equities/tofas-turk-otomobil-fabrikasi'},
    {sym:'TCELL.IS',name:'TCELL',link:'https://www.investing.com/equities/turkcell-iletisim-hizmetleri'},
    {sym:'TAVHL.IS',name:'TAVHL',link:'https://www.investing.com/equities/tav-havalimanlari'},
    {sym:'PGSUS.IS',name:'PGSUS',link:'https://www.investing.com/equities/pegasus-hava-tasimaciligi'},
    {sym:'EKGYO.IS',name:'EKGYO',link:'https://www.investing.com/equities/emlak-konut-gayrimenkul'},
    {sym:'PETKM.IS',name:'PETKM',link:'https://www.investing.com/equities/petkim-petrokimya'},
    {sym:'TRALT.IS',name:'TRALT',link:'https://www.investing.com/equities/koza-altin'},
    {sym:'TTKOM.IS',name:'TTKOM',link:'https://www.investing.com/equities/turk-telekomunikasyon'},
    {sym:'ARCLK.IS',name:'ARCLK',link:'https://www.investing.com/equities/arcelik'},
    {sym:'ENKAI.IS',name:'ENKAI',link:'https://www.investing.com/equities/enka-insaat-ve-sanayi'},
    {sym:'TKFEN.IS',name:'TKFEN',link:'https://www.investing.com/equities/tekfen-holding'},
    {sym:'SASA.IS',name:'SASA',link:'https://www.investing.com/equities/sasa-polyester-sanayi'},
    {sym:'GUBRF.IS',name:'GUBRF',link:'https://www.investing.com/equities/gubre-fabrikalari'},
    {sym:'DOHOL.IS',name:'DOHOL',link:'https://www.investing.com/equities/dogan-sirketler-grubu'},
    {sym:'MGROS.IS',name:'MGROS',link:'https://www.investing.com/equities/migros-ticaret'},
    {sym:'SOKM.IS',name:'SOKM',link:'https://www.investing.com/equities/sok-marketler-ticaret'},
    {sym:'ULKER.IS',name:'ULKER',link:'https://www.investing.com/equities/ulker-biskuvi-sanayi'},
    {sym:'VESTL.IS',name:'VESTL',link:'https://www.investing.com/equities/vestel-elektronik'},
    {sym:'OTKAR.IS',name:'OTKAR',link:'https://www.investing.com/equities/otokar'},
    {sym:'TTRAK.IS',name:'TTRAK',link:'https://www.investing.com/equities/turk-traktor-ve-ziraat-makineleri'},
    {sym:'LOGO.IS',name:'LOGO',link:'https://www.investing.com/equities/logo-yazilim'},
    {sym:'MAVI.IS',name:'MAVI',link:'https://www.investing.com/equities/mavi-giyim-sanayi-ve-ticaret'},
    {sym:'AEFES.IS',name:'AEFES',link:'https://www.investing.com/equities/anadolu-efes'},
    {sym:'ENJSA.IS',name:'ENJSA',link:'https://www.investing.com/equities/enerjisa-enerji'},
    {sym:'KONTR.IS',name:'KONTR',link:'https://www.investing.com/equities/kontrolmatik-teknoloji'},
  ],
  commodities: [
    {sym:'GC=F',name:{tr:'Altin (Ons)',en:'Gold (Oz)'},link:'https://www.investing.com/commodities/gold'},
    {sym:'SI=F',name:{tr:'Gumus',en:'Silver'},link:'https://www.investing.com/commodities/silver'},
    {sym:'CL=F',name:{tr:'Petrol (WTI)',en:'Oil (WTI)'},link:'https://www.investing.com/commodities/crude-oil'},
    {sym:'NG=F',name:{tr:'Dogalgaz',en:'Nat. Gas'},link:'https://www.investing.com/commodities/natural-gas'},
  ],
  fx: [
    {sym:'USDTRY=X',name:'USD/TRY',link:'https://www.investing.com/currencies/usd-try'},
    {sym:'EURTRY=X',name:'EUR/TRY',link:'https://www.investing.com/currencies/eur-try'},
    {sym:'GBPTRY=X',name:'GBP/TRY',link:'https://www.investing.com/currencies/gbp-try'},
    {sym:'EURUSD=X',name:'EUR/USD',link:'https://www.investing.com/currencies/eur-usd'},
  ],
  crypto: [
    {sym:'BTC-USD',name:'Bitcoin',link:'https://www.investing.com/crypto/bitcoin'},
    {sym:'ETH-USD',name:'Ethereum',link:'https://www.investing.com/crypto/ethereum'},
    {sym:'SOL-USD',name:'Solana',link:'https://www.investing.com/crypto/solana'},
    {sym:'XRP-USD',name:'XRP',link:'https://www.investing.com/crypto/xrp'},
  ],
};

let mktCache={};
let mktFetching=false;
let mktRetryTimer=null;
let mktCacheLoaded=false; // true when bulk cache has been fetched

// Symbol mapping (if cache uses different symbols than local)
const SYM_MAP={};
function cSym(s){return SYM_MAP[s]||s;}

async function fetchOneMkt(sym){
  try{
    const d=await safeGet(yahooProxy(sym));
    const meta=d?.chart?.result?.[0]?.meta;
    if(meta?.regularMarketPrice){
      const price=meta.regularMarketPrice;
      const prev=meta.chartPreviousClose||meta.previousClose||price;
      const change=price-prev;
      const changePct=prev?((change/prev)*100):0;
      mktCache[sym]={price,change,changePct,ok:true,cur:meta.currency||'',exch:meta.exchangeName||''};
      return true;
    }
  }catch(e){}
  if(!mktCache[sym]?.ok) mktCache[sym]={ok:false};
  return false;
}

// FAST PATH: Fetch all prices from our serverless cache in ONE request
async function fetchMarketCache(){
  try{
    const resp=await fetch('/api/prices-cache');
    if(!resp.ok) throw new Error('Cache HTTP '+resp.status);
    const data=await resp.json();
    if(data?.prices){
      const allItems=Object.values(MARKET_ITEMS).flat();
      allItems.forEach(item=>{
        const key=cSym(item.sym);
        const p=data.prices[key];
        if(p){
          mktCache[item.sym]={price:p.price,change:p.change,changePct:p.changePct,ok:true,cur:p.currency||''};
        }
      });
      mktCacheLoaded=true;
      console.log('[Markets] Cache loaded:',data.count+'/'+data.total,'symbols');
      return true;
    }
  }catch(e){
    console.warn('[Markets] Cache unavailable, falling back to individual fetch:',e.message);
  }
  return false;
}

async function fetchAllMarketPrices(){
  if(mktFetching) return;
  mktFetching=true;
  const btn=document.getElementById('mktRefreshBtn');
  if(btn){btn.disabled=true;btn.textContent=LANG==='tr'?'Yukleniyor...':'Loading...';}
  const countEl=document.getElementById('mktCount');
  const allItems=Object.values(MARKET_ITEMS).flat();

  // Step 1: Try bulk cache first (instant)
  const cacheOk=await fetchMarketCache();
  if(cacheOk){
    updateMktCards();
    if(countEl){
      const ok=Object.values(mktCache).filter(v=>v.ok).length;
      countEl.textContent=`${ok}/${allItems.length}`;
    }
  }

  // Step 2: Fetch any missing items individually (fallback)
  const missing=allItems.filter(item=>!mktCache[item.sym]?.ok);
  if(missing.length>0){
    for(let i=0;i<missing.length;i+=5){
      const batch=missing.slice(i,i+5);
      await Promise.all(batch.map(item=>fetchOneMkt(item.sym)));
      updateMktCards();
      if(countEl){
        const ok=Object.values(mktCache).filter(v=>v.ok).length;
        countEl.textContent=`${ok}/${allItems.length}`;
      }
      if(i+5<missing.length) await new Promise(r=>setTimeout(r,80));
    }
  }

  mktFetching=false;
  if(btn){btn.disabled=false;btn.textContent=LANG==='tr'?'Guncelle':'Refresh';}

  // Schedule retry for still-failed items
  const failed=allItems.filter(item=>!mktCache[item.sym]?.ok);
  if(failed.length>0) scheduleRetry(failed);
}

function scheduleRetry(failedItems){
  if(mktRetryTimer) clearTimeout(mktRetryTimer);
  mktRetryTimer=setTimeout(async()=>{
    if(mktFetching) return;
    console.log('[Markets] Retrying',failedItems.length,'failed items...');
    for(let i=0;i<failedItems.length;i+=3){
      const batch=failedItems.slice(i,i+3);
      await Promise.all(batch.map(item=>fetchOneMkt(item.sym)));
      updateMktCards();
      if(i+3<failedItems.length) await new Promise(r=>setTimeout(r,150));
    }
    const countEl=document.getElementById('mktCount');
    if(countEl){
      const allItems=Object.values(MARKET_ITEMS).flat();
      const ok=Object.values(mktCache).filter(v=>v.ok).length;
      countEl.textContent=`${ok}/${allItems.length}`;
    }
    // If still failed, retry again
    const stillFailed=failedItems.filter(item=>!mktCache[item.sym]?.ok);
    if(stillFailed.length>0 && currentPage==='markets'){
      scheduleRetry(stillFailed);
    }
  },60000); // retry every 60 seconds
}

function updateMktCards(){
  Object.values(MARKET_ITEMS).flat().forEach(item=>{
    const card=document.getElementById('mkt_'+item.sym.replace(/[^a-zA-Z0-9]/g,'_'));
    if(!card) return;
    const p=mktCache[item.sym];
    const priceEl=card.querySelector('.mkt-price');
    const chgEl=card.querySelector('.mkt-chg');
    if(!p||!p.ok){
      if(priceEl) priceEl.innerHTML=mktFetching?'<span style="animation:pulse 1s infinite">···</span>':`<span style="color:var(--muted);font-size:0.56rem">${LANG==='tr'?'Bekleniyor...':'Waiting...'}</span>`;
      if(chgEl){chgEl.textContent='';chgEl.style.color='var(--muted)';}
      return;
    }
    const up=p.changePct>=0;
    if(priceEl) priceEl.textContent=p.price>=1000?fmt(p.price,0):p.price>=10?fmt(p.price,2):p.price.toFixed(4);
    if(chgEl){chgEl.textContent=(up?'+':'')+p.changePct.toFixed(2)+'%';chgEl.style.color=up?'var(--success)':'var(--danger)';}
    card.style.transition='box-shadow 0.4s';
    card.style.boxShadow=`inset 0 -2px 0 ${up?'var(--success)':'var(--danger)'}`;
    setTimeout(()=>{card.style.boxShadow='';},1200);
  });
}

// ── SEARCH SUGGESTIONS — extended list ──
const SEARCH_SUGGESTIONS=[
  // US Stocks
  {sym:'AAPL',name:'Apple',cat:'US'},{sym:'TSLA',name:'Tesla',cat:'US'},{sym:'MSFT',name:'Microsoft',cat:'US'},
  {sym:'GOOGL',name:'Alphabet Google',cat:'US'},{sym:'AMZN',name:'Amazon',cat:'US'},{sym:'NVDA',name:'NVIDIA',cat:'US'},
  {sym:'META',name:'Meta Facebook',cat:'US'},{sym:'NFLX',name:'Netflix',cat:'US'},{sym:'AMD',name:'AMD',cat:'US'},
  {sym:'INTC',name:'Intel',cat:'US'},{sym:'CRM',name:'Salesforce',cat:'US'},{sym:'PYPL',name:'PayPal',cat:'US'},
  {sym:'DIS',name:'Walt Disney',cat:'US'},{sym:'BA',name:'Boeing',cat:'US'},{sym:'JPM',name:'JPMorgan Chase',cat:'US'},
  {sym:'V',name:'Visa',cat:'US'},{sym:'MA',name:'Mastercard',cat:'US'},{sym:'KO',name:'Coca-Cola',cat:'US'},
  {sym:'PEP',name:'PepsiCo',cat:'US'},{sym:'WMT',name:'Walmart',cat:'US'},{sym:'COST',name:'Costco',cat:'US'},
  // BIST Stocks
  {sym:'THYAO.IS',name:'Turk Hava Yollari THY',cat:'BIST'},{sym:'ASELS.IS',name:'ASELSAN',cat:'BIST'},
  {sym:'GARAN.IS',name:'Garanti BBVA Bankasi',cat:'BIST'},{sym:'AKBNK.IS',name:'Akbank',cat:'BIST'},
  {sym:'YKBNK.IS',name:'Yapi Kredi Bankasi',cat:'BIST'},{sym:'ISCTR.IS',name:'Is Bankasi',cat:'BIST'},
  {sym:'HALKB.IS',name:'Halkbank',cat:'BIST'},{sym:'VAKBN.IS',name:'Vakifbank',cat:'BIST'},
  {sym:'KCHOL.IS',name:'Koc Holding',cat:'BIST'},{sym:'SAHOL.IS',name:'Sabanci Holding',cat:'BIST'},
  {sym:'TUPRS.IS',name:'Tupras Petrol Rafineri',cat:'BIST'},{sym:'SISE.IS',name:'Sisecam',cat:'BIST'},
  {sym:'EREGL.IS',name:'Eregli Demir Celik',cat:'BIST'},{sym:'BIMAS.IS',name:'BIM Magazalar',cat:'BIST'},
  {sym:'TAVHL.IS',name:'TAV Havalimanlari',cat:'BIST'},{sym:'PGSUS.IS',name:'Pegasus Havacilik',cat:'BIST'},
  {sym:'FROTO.IS',name:'Ford Otosan',cat:'BIST'},{sym:'TOASO.IS',name:'Tofas Oto',cat:'BIST'},
  {sym:'TCELL.IS',name:'Turkcell',cat:'BIST'},{sym:'EKGYO.IS',name:'Emlak Konut GYO',cat:'BIST'},
  {sym:'PETKM.IS',name:'Petkim',cat:'BIST'},{sym:'TRALT.IS',name:'Turk Altin TRALT',cat:'BIST'},
  {sym:'TTKOM.IS',name:'Turk Telekom',cat:'BIST'},
  {sym:'ULKER.IS',name:'Ulker Biskuvi',cat:'BIST'},{sym:'ARCLK.IS',name:'Arcelik',cat:'BIST'},
  {sym:'VESTL.IS',name:'Vestel Elektronik',cat:'BIST'},{sym:'MGROS.IS',name:'Migros Ticaret',cat:'BIST'},
  {sym:'SOKM.IS',name:'Sok Marketler',cat:'BIST'},{sym:'DOHOL.IS',name:'Dogan Holding',cat:'BIST'},
  {sym:'ENKAI.IS',name:'Enka Insaat',cat:'BIST'},{sym:'OYAKC.IS',name:'Oyak Cimento',cat:'BIST'},
  {sym:'AEFES.IS',name:'Anadolu Efes',cat:'BIST'},{sym:'TTRAK.IS',name:'Turk Traktor',cat:'BIST'},
  {sym:'CIMSA.IS',name:'Cimsa Cimento',cat:'BIST'},{sym:'OTKAR.IS',name:'Otokar',cat:'BIST'},
  {sym:'LOGO.IS',name:'Logo Yazilim',cat:'BIST'},{sym:'NETAS.IS',name:'Netas Telekom',cat:'BIST'},
  {sym:'MAVI.IS',name:'Mavi Giyim',cat:'BIST'},{sym:'BRISA.IS',name:'Brisa Bridgestone',cat:'BIST'},
  {sym:'ISGYO.IS',name:'Is GYO',cat:'BIST'},{sym:'TKFEN.IS',name:'Tekfen Holding',cat:'BIST'},
  {sym:'SASA.IS',name:'SASA Polyester',cat:'BIST'},{sym:'GUBRF.IS',name:'Gubre Fabrikalari',cat:'BIST'},
  {sym:'GESAN.IS',name:'Girisim Elektrik',cat:'BIST'},{sym:'ENJSA.IS',name:'Enerjisa Enerji',cat:'BIST'},
  {sym:'KONTR.IS',name:'Kontrolmatik',cat:'BIST'},{sym:'EUPWR.IS',name:'EuroEnergy',cat:'BIST'},
  // Crypto
  {sym:'BTC-USD',name:'Bitcoin BTC',cat:'Kripto'},{sym:'ETH-USD',name:'Ethereum ETH',cat:'Kripto'},
  {sym:'SOL-USD',name:'Solana SOL',cat:'Kripto'},{sym:'XRP-USD',name:'XRP Ripple',cat:'Kripto'},
  {sym:'ADA-USD',name:'Cardano ADA',cat:'Kripto'},{sym:'AVAX-USD',name:'Avalanche AVAX',cat:'Kripto'},
  {sym:'DOGE-USD',name:'Dogecoin DOGE',cat:'Kripto'},{sym:'BNB-USD',name:'BNB Binance',cat:'Kripto'},
  {sym:'DOT-USD',name:'Polkadot DOT',cat:'Kripto'},{sym:'MATIC-USD',name:'Polygon MATIC',cat:'Kripto'},
  {sym:'LINK-USD',name:'Chainlink LINK',cat:'Kripto'},{sym:'UNI-USD',name:'Uniswap UNI',cat:'Kripto'},
  {sym:'SHIB-USD',name:'Shiba Inu SHIB',cat:'Kripto'},
  // Commodities & Forex
  {sym:'GC=F',name:'Altin Gold Futures',cat:'Emtia'},{sym:'SI=F',name:'Gumus Silver',cat:'Emtia'},
  {sym:'CL=F',name:'Petrol Crude Oil WTI',cat:'Emtia'},{sym:'NG=F',name:'Dogalgaz Natural Gas',cat:'Emtia'},
  {sym:'PL=F',name:'Platin Platinum',cat:'Emtia'},{sym:'HG=F',name:'Bakir Copper',cat:'Emtia'},
  {sym:'USDTRY=X',name:'Dolar TL USD/TRY',cat:'Doviz'},{sym:'EURTRY=X',name:'Euro TL EUR/TRY',cat:'Doviz'},
  {sym:'GBPTRY=X',name:'Sterlin TL GBP/TRY',cat:'Doviz'},{sym:'EURUSD=X',name:'Euro Dolar EUR/USD',cat:'Doviz'},
  {sym:'GBPUSD=X',name:'Sterlin Dolar GBP/USD',cat:'Doviz'},{sym:'USDJPY=X',name:'Dolar Yen USD/JPY',cat:'Doviz'},
  // ETFs
  {sym:'SPY',name:'SPDR S&P 500 ETF',cat:'ETF'},{sym:'QQQ',name:'Invesco QQQ NASDAQ ETF',cat:'ETF'},
  {sym:'TLT',name:'iShares 20+ Year Treasury',cat:'ETF'},{sym:'GLD',name:'SPDR Gold Shares',cat:'ETF'},
  {sym:'DJIST.IS',name:'DJIST BIST-100 ETF',cat:'ETF'},{sym:'IWM',name:'iShares Russell 2000',cat:'ETF'},
  {sym:'VTI',name:'Vanguard Total Stock Market',cat:'ETF'},{sym:'EEM',name:'iShares MSCI Emerging',cat:'ETF'},
  // BIST Ek Hisseler (100+ sembol)
  {sym:'KOZAA.IS',name:'Koza Anadolu Metal',cat:'BIST'},{sym:'IPEKE.IS',name:'Ipek Dogal Enerji',cat:'BIST'},
  {sym:'BUCIM.IS',name:'Bursa Cimento',cat:'BIST'},{sym:'AKSA.IS',name:'Aksa Akrilik',cat:'BIST'},
  {sym:'ALARK.IS',name:'Alarko Holding',cat:'BIST'},{sym:'AGHOL.IS',name:'AG Anadolu Grubu Hold',cat:'BIST'},
  {sym:'AKSEN.IS',name:'Aksa Enerji',cat:'BIST'},{sym:'ALFAS.IS',name:'Alfa Solar Enerji',cat:'BIST'},
  {sym:'ANHYT.IS',name:'Anadolu Hayat Emeklilik',cat:'BIST'},{sym:'ANSGR.IS',name:'Anadolu Sigorta',cat:'BIST'},
  {sym:'BERA.IS',name:'Bera Holding',cat:'BIST'},{sym:'BEYAZ.IS',name:'Beyaz Filo',cat:'BIST'},
  {sym:'BINHO.IS',name:'Bingol Holding',cat:'BIST'},{sym:'BIOEN.IS',name:'Biotrend Cevre Enerji',cat:'BIST'},
  {sym:'BRYAT.IS',name:'Borusan Yatirim',cat:'BIST'},{sym:'BTCIM.IS',name:'Bati Cimento',cat:'BIST'},
  {sym:'CCOLA.IS',name:'Coca-Cola Icecek',cat:'BIST'},{sym:'CEMTS.IS',name:'Cemtas Celik',cat:'BIST'},
  {sym:'CEMAS.IS',name:'Cemas Dokum',cat:'BIST'},{sym:'CWENE.IS',name:'CW Enerji',cat:'BIST'},
  {sym:'DOAS.IS',name:'Dogus Otomotiv',cat:'BIST'},{sym:'ECILC.IS',name:'Eczacibasi Ilac',cat:'BIST'},
  {sym:'EGEEN.IS',name:'Ege Endustri',cat:'BIST'},{sym:'EUREN.IS',name:'Euro Enerji',cat:'BIST'},
  {sym:'GLYHO.IS',name:'Global Yatirim Holding',cat:'BIST'},{sym:'GSDHO.IS',name:'GSD Holding',cat:'BIST'},
  {sym:'GWIND.IS',name:'Galata Wind Enerji',cat:'BIST'},{sym:'HEKTS.IS',name:'Hektas Ticaret',cat:'BIST'},
  {sym:'HLGYO.IS',name:'Halk GYO',cat:'BIST'},{sym:'HUNER.IS',name:'Hun Yenilenebilir Enerji',cat:'BIST'},
  {sym:'INDES.IS',name:'Indes Bilisim',cat:'BIST'},{sym:'ISDMR.IS',name:'Iskenderun Demir Celik',cat:'BIST'},
  {sym:'ISFIN.IS',name:'Is Finansal Kiralama',cat:'BIST'},{sym:'ISMEN.IS',name:'Is Yatirim Menkul',cat:'BIST'},
  {sym:'KARSN.IS',name:'Karsan Otomotiv',cat:'BIST'},{sym:'KAYSE.IS',name:'Kayseri Seker',cat:'BIST'},
  {sym:'KERVT.IS',name:'Kerevitas Gida',cat:'BIST'},{sym:'KLSER.IS',name:'Kiler Alisveris',cat:'BIST'},
  {sym:'KONYA.IS',name:'Konya Cimento',cat:'BIST'},{sym:'KRDMD.IS',name:'Kardemir D',cat:'BIST'},
  {sym:'KTLEV.IS',name:'Katilim Emeklilik',cat:'BIST'},{sym:'MPARK.IS',name:'MLP Saglik',cat:'BIST'},
  {sym:'ODAS.IS',name:'Odas Elektrik',cat:'BIST'},{sym:'OYAKC.IS',name:'Oyak Cimento',cat:'BIST'},
  {sym:'PAPIL.IS',name:'Papilon Savunma',cat:'BIST'},{sym:'PEKGY.IS',name:'Peker GYO',cat:'BIST'},
  {sym:'PRDGS.IS',name:'Pardus Girisim',cat:'BIST'},{sym:'QUAGR.IS',name:'QUA Granite',cat:'BIST'},
  {sym:'RGYAS.IS',name:'RTA Laboratuvarlari',cat:'BIST'},{sym:'SAHOL.IS',name:'Sabanci Holding',cat:'BIST'},
  {sym:'SELEC.IS',name:'Selcuk Ecza',cat:'BIST'},{sym:'SKBNK.IS',name:'Sekerbank',cat:'BIST'},
  {sym:'SMRTG.IS',name:'Smart Gunes Enerjisi',cat:'BIST'},{sym:'SNGYO.IS',name:'Sinpas GYO',cat:'BIST'},
  {sym:'TBORG.IS',name:'Turborg Bira',cat:'BIST'},{sym:'TKNSA.IS',name:'Teknosa',cat:'BIST'},
  {sym:'TMSN.IS',name:'Turmsan DES',cat:'BIST'},{sym:'TRGYO.IS',name:'Torunlar GYO',cat:'BIST'},
  {sym:'TURSG.IS',name:'Turkiye Sigorta',cat:'BIST'},{sym:'VAKKO.IS',name:'Vakko Tekstil',cat:'BIST'},
  {sym:'VERUS.IS',name:'Verusa Holding',cat:'BIST'},{sym:'YEOTK.IS',name:'Yeo Teknoloji',cat:'BIST'},
  {sym:'YYLGD.IS',name:'Yayladagi Gida',cat:'BIST'},{sym:'ZOREN.IS',name:'Zorlu Enerji',cat:'BIST'},
  // Ek Global
  {sym:'BABA',name:'Alibaba',cat:'US'},{sym:'TSM',name:'TSMC Taiwan Semi',cat:'US'},
  {sym:'ASML',name:'ASML Holding',cat:'US'},{sym:'AVGO',name:'Broadcom',cat:'US'},
  {sym:'ORCL',name:'Oracle',cat:'US'},{sym:'ADBE',name:'Adobe',cat:'US'},
  {sym:'UBER',name:'Uber Technologies',cat:'US'},{sym:'ABNB',name:'Airbnb',cat:'US'},
  {sym:'COIN',name:'Coinbase',cat:'US'},{sym:'PLTR',name:'Palantir',cat:'US'},
  {sym:'SNOW',name:'Snowflake',cat:'US'},{sym:'SQ',name:'Block Square',cat:'US'},
  {sym:'RIVN',name:'Rivian Automotive',cat:'US'},{sym:'LCID',name:'Lucid Group',cat:'US'},
  {sym:'NIO',name:'NIO Inc',cat:'US'},{sym:'XPEV',name:'XPeng',cat:'US'},
  {sym:'ARM',name:'ARM Holdings',cat:'US'},{sym:'SMCI',name:'Super Micro Computer',cat:'US'},
  {sym:'MRVL',name:'Marvell Technology',cat:'US'},{sym:'MU',name:'Micron Technology',cat:'US'},
  // Ek Emtialar
  {sym:'ZC=F',name:'Misir Corn',cat:'Emtia'},{sym:'ZW=F',name:'Bugday Wheat',cat:'Emtia'},
  {sym:'ZS=F',name:'Soya Soybean',cat:'Emtia'},{sym:'KC=F',name:'Kahve Coffee',cat:'Emtia'},
  {sym:'CT=F',name:'Pamuk Cotton',cat:'Emtia'},{sym:'SB=F',name:'Seker Sugar',cat:'Emtia'},
  {sym:'PA=F',name:'Paladyum Palladium',cat:'Emtia'},{sym:'BZ=F',name:'Brent Petrol Brent Oil',cat:'Emtia'},
  // Ek Doviz
  {sym:'CHFTRY=X',name:'Frank TL CHF/TRY',cat:'Doviz'},{sym:'JPYTRY=X',name:'Yen TL JPY/TRY',cat:'Doviz'},
  {sym:'CNYTRY=X',name:'Yuan TL CNY/TRY',cat:'Doviz'},{sym:'AUDTRY=X',name:'AUD TL',cat:'Doviz'},
  {sym:'CADTRY=X',name:'CAD TL',cat:'Doviz'},{sym:'AUDUSD=X',name:'AUD/USD',cat:'Doviz'},
  {sym:'USDCAD=X',name:'USD/CAD',cat:'Doviz'},{sym:'USDCHF=X',name:'USD/CHF',cat:'Doviz'},
  {sym:'USDCNY=X',name:'USD/CNY',cat:'Doviz'},{sym:'EURJPY=X',name:'EUR/JPY',cat:'Doviz'},
  // Ek Kripto
  {sym:'ATOM-USD',name:'Cosmos ATOM',cat:'Kripto'},{sym:'FTM-USD',name:'Fantom FTM',cat:'Kripto'},
  {sym:'NEAR-USD',name:'NEAR Protocol',cat:'Kripto'},{sym:'ALGO-USD',name:'Algorand ALGO',cat:'Kripto'},
  {sym:'APT-USD',name:'Aptos APT',cat:'Kripto'},{sym:'ARB11841-USD',name:'Arbitrum ARB',cat:'Kripto'},
  {sym:'OP-USD',name:'Optimism OP',cat:'Kripto'},{sym:'INJ-USD',name:'Injective INJ',cat:'Kripto'},
  {sym:'PEPE24478-USD',name:'PEPE',cat:'Kripto'},{sym:'LTC-USD',name:'Litecoin LTC',cat:'Kripto'},
  // Ek Endeksler
  {sym:'^N225',name:'Nikkei 225 Japonya',cat:'Endeks'},{sym:'^HSI',name:'Hang Seng Hong Kong',cat:'Endeks'},
  {sym:'^SSEC',name:'Shanghai Composite Cin',cat:'Endeks'},{sym:'^BVSP',name:'Bovespa Brezilya',cat:'Endeks'},
  {sym:'^AXJO',name:'ASX 200 Avustralya',cat:'Endeks'},{sym:'^KS11',name:'KOSPI Kore',cat:'Endeks'},
  {sym:'^NSEI',name:'Nifty 50 Hindistan',cat:'Endeks'},{sym:'^STOXX50E',name:'Euro Stoxx 50',cat:'Endeks'},
  {sym:'^RUT',name:'Russell 2000',cat:'Endeks'},{sym:'^VIX',name:'VIX Korku Endeksi',cat:'Endeks'},
];

let mktDDOpen=false;
let mktCategoryFilter='all';

function filterMktByCategory(cat){
  mktCategoryFilter=cat;
  document.querySelectorAll('.mkt-tab-btn').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.cat===cat);
  });
  // Re-filter search if input has value
  const input=document.getElementById('mktSearchInput');
  if(input&&input.value) onMktSearch(input.value);
  // Show/hide market sections based on category
  const sectionMap={all:null,BIST:'stocks',Emtia:'commodities',Doviz:'fx',Kripto:'crypto',Endeks:'indices',US:'stocks',ETF:'stocks'};
  document.querySelectorAll('.mkt-section').forEach(sec=>{
    if(cat==='all'){sec.style.display='';return;}
    sec.style.display=sec.dataset.cat===cat?'':'none';
  });
}

function onMktSearch(val){
  const dd=document.getElementById('mktSearchDD');
  if(!dd) return;
  if(!val||val.length<1){dd.innerHTML='';dd.style.display='none';mktDDOpen=false;return;}
  const q=val.toUpperCase();
  const matches=SEARCH_SUGGESTIONS.filter(s=>{
    const matchesText=s.sym.toUpperCase().includes(q)||s.name.toUpperCase().includes(q);
    const matchesCat=mktCategoryFilter==='all'||s.cat===mktCategoryFilter;
    return matchesText&&matchesCat;
  }).slice(0,12);
  if(matches.length===0){
    dd.innerHTML=`<div style="padding:10px 14px;font-size:0.56rem;color:var(--muted)">${LANG==='tr'?'Listede yok — Enter ile dogrudan \"'+val+'\" sembolunu ara':'Not in list — press Enter to search \"'+val+'\" directly'}</div>`;
    dd.style.display='block';mktDDOpen=true;
    return;
  }
  dd.innerHTML=matches.map(s=>`<div class="mkt-dd-item" onmousedown="event.preventDefault();pickMktSuggestion('${s.sym}')" style="padding:10px 14px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);transition:background 0.15s">
    <div><span style="font-weight:600;font-family:'Geist Mono',monospace;font-size:0.58rem">${s.sym}</span> <span style="color:var(--text2);font-size:0.54rem;margin-left:6px">${s.name}</span></div>
    <span style="font-size:0.48rem;background:var(--surface2);padding:2px 8px;border-radius:6px;color:var(--muted)">${s.cat}</span>
  </div>`).join('');
  dd.style.display='block';mktDDOpen=true;
}

function pickMktSuggestion(sym){
  const input=document.getElementById('mktSearchInput');
  if(input) input.value=sym;
  closeMktDD();
  doMktSearch(sym);
}

function closeMktDD(){
  const dd=document.getElementById('mktSearchDD');
  if(dd){dd.innerHTML='';dd.style.display='none';}
  mktDDOpen=false;
}

function searchMarketTicker(){
  const input=document.getElementById('mktSearchInput');
  if(!input||!input.value.trim()) return;
  closeMktDD();
  doMktSearch(input.value.trim().toUpperCase());
}

async function doMktSearch(sym){
  if(!sym) return;
  const resultEl=document.getElementById('mktSearchResult');
  const statusEl=document.getElementById('mktSearchStatus');
  if(statusEl) statusEl.innerHTML=`<span style="animation:pulse 1s infinite">${LANG==='tr'?'Araniyor: '+sym+'...':'Searching: '+sym+'...'}</span>`;
  if(resultEl) resultEl.innerHTML='';
  try{
    const d=await safeGet(yahooProxy(sym));
    const meta=d?.chart?.result?.[0]?.meta;
    if(meta?.regularMarketPrice){
      const price=meta.regularMarketPrice;
      const prev=meta.chartPreviousClose||meta.previousClose||price;
      const change=price-prev;
      const pct=prev?((change/prev)*100):0;
      const up=pct>=0;
      const cur=meta.currency||'';
      const mono="font-family:'Geist Mono',monospace";
      const allFlat=Object.values(MARKET_ITEMS).flat();
      const match=allFlat.find(x=>x.sym===sym);
      const link=match?.link||`https://finance.yahoo.com/quote/${encodeURIComponent(sym)}`;
      if(statusEl) statusEl.textContent='';
      if(resultEl) resultEl.innerHTML=`<a href="${link}" target="_blank" rel="noopener" class="ana-card" style="padding:16px;max-width:360px;animation:anaIn 0.3s ease-out both;text-decoration:none;display:block;cursor:pointer">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:0.70rem;font-weight:700;color:var(--text)">${meta.symbol||sym}</div>
          <div style="font-size:0.54rem;color:var(--muted)">${meta.exchangeName||''} · ${cur}</div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:10px">
          <div style="${mono};font-size:0.95rem;font-weight:700;color:var(--text)">${price>=1000?fmt(price,0):price>=10?fmt(price,2):price.toFixed(4)}</div>
          <div style="${mono};font-size:0.66rem;font-weight:600;color:${up?'var(--success)':'var(--danger)'}">${up?'+':''}${pct.toFixed(2)}%</div>
        </div>
        <div style="${mono};font-size:0.56rem;color:${up?'var(--success)':'var(--danger)'};margin-top:3px">${up?'+':''}${Math.abs(change)>=100?fmt(change,0):change.toFixed(2)} ${cur}</div>
        <div style="font-size:0.52rem;color:var(--muted);margin-top:6px">${LANG==='tr'?'Onceki kapanıs: ':'Prev close: '}${prev>=100?fmt(prev,0):prev.toFixed(2)} · ${LANG==='tr'?'Tiklayarak detay ↗':'Click for details ↗'}</div>
      </a>`;
    } else {
      if(statusEl) statusEl.textContent=LANG==='tr'?'\"'+sym+'\" bulunamadi. Dogru Yahoo Finance sembolunu deneyin.':'\"'+sym+'\" not found. Try the correct Yahoo Finance symbol.';
    }
  }catch(e){
    if(statusEl) statusEl.textContent=(LANG==='tr'?'Hata: ':'Error: ')+e.message;
  }
}

function renderMarkets(){
  const el=document.getElementById('marketsSection');
  if(!el) return;
  const tr=LANG==='tr', mono="font-family:'Geist Mono',monospace";

  function secTitle(title){return `<div style="font-size:0.72rem;font-weight:600;color:var(--text);margin:20px 0 10px;padding-bottom:6px;border-bottom:2px solid var(--accent)">${title}</div>`;}

  function renderGroup(items){
    let h='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">';
    items.forEach((item,idx)=>{
      const name=typeof item.name==='object'?L(item.name):item.name;
      const cardId='mkt_'+item.sym.replace(/[^a-zA-Z0-9]/g,'_');
      const p=mktCache[item.sym];
      const priceText=p?.ok?(p.price>=1000?fmt(p.price,0):p.price>=10?fmt(p.price,2):p.price.toFixed(4)):'···';
      const chgText=p?.ok?((p.changePct>=0?'+':'')+p.changePct.toFixed(2)+'%'):'';
      const up=p?.ok?p.changePct>=0:true;
      h+=`<a href="${item.link}" target="_blank" rel="noopener" id="${cardId}" class="ana-card" style="padding:12px 14px;text-decoration:none;cursor:pointer;animation-delay:${idx*30}ms">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:0.62rem;font-weight:600;color:var(--text)">${name}</div>
          <div class="mkt-chg" style="${mono};font-size:0.56rem;font-weight:600;color:${up?'var(--success)':'var(--danger)'}">${chgText}</div>
        </div>
        <div class="mkt-price" style="${mono};font-size:0.78rem;font-weight:700;color:var(--text);margin-top:6px">${priceText}</div>
      </a>`;
    });
    h+='</div>';
    return h;
  }

  const allCount=Object.values(MARKET_ITEMS).flat().length;
  const okCount=Object.values(mktCache).filter(v=>v.ok).length;

  let h=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
    <div>
      <div style="font-size:0.88rem;font-weight:600;color:var(--text)">${tr?'Canli Piyasa Verileri':'Live Market Data'}</div>
      <div style="font-size:0.52rem;color:var(--muted);margin-top:2px"><span id="mktCount">${okCount}/${allCount}</span> ${tr?'yuklendi':'loaded'}${mktFetching?(tr?' · Cekiliyor...':' · Fetching...'):''}</div>
    </div>
    <button id="mktRefreshBtn" class="btn btn-ghost" onclick="fetchAllMarketPrices()" style="font-size:0.56rem">${mktFetching?(tr?'Yukleniyor...':'Loading...'):(tr?'Guncelle':'Refresh')}</button>
  </div>`;

  // Category tabs
  const cats=[
    {key:'all',label:tr?'Tumu':'All'},
    {key:'BIST',label:'BIST'},
    {key:'Emtia',label:tr?'Emtia':'Commodities'},
    {key:'Doviz',label:tr?'Doviz':'Forex'},
    {key:'Kripto',label:tr?'Kripto':'Crypto'},
    {key:'Endeks',label:tr?'Endeks':'Indices'},
    {key:'US',label:'US'},
    {key:'ETF',label:'ETF'},
  ];
  h+=`<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">`;
  cats.forEach(c=>{
    const isActive=mktCategoryFilter===c.key;
    h+=`<button class="mkt-tab-btn${isActive?' active':''}" data-cat="${c.key}" onclick="filterMktByCategory('${c.key}')"
      style="padding:6px 14px;border-radius:8px;font-size:0.56rem;font-weight:600;border:1px solid ${isActive?'var(--accent)':'var(--border)'};
      background:${isActive?'var(--accent)':'var(--surface)'};color:${isActive?'#fff':'var(--text)'};cursor:pointer;transition:all 0.15s;font-family:inherit">${c.label}</button>`;
  });
  h+=`</div>`;

  // Search bar
  h+=`<div style="position:relative;margin-bottom:16px">
    <div style="display:flex;gap:8px;align-items:center">
      <div style="position:relative;flex:1">
        <input id="mktSearchInput" type="text" placeholder="${tr?'Sembol veya isim ara... (AAPL, Ulker, Bitcoin, THYAO)':'Search symbol or name... (AAPL, Ulker, Bitcoin, THYAO)'}"
          style="width:100%;padding:10px 14px;border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);font-size:0.58rem;font-family:'Geist Mono',monospace;outline:none;box-sizing:border-box"
          oninput="onMktSearch(this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault();searchMarketTicker()}"
          onblur="setTimeout(closeMktDD,200)" autocomplete="off">
        <div id="mktSearchDD" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--surface);border:1px solid var(--border);border-top:none;border-radius:0 0 10px 10px;box-shadow:0 8px 24px rgba(0,0,0,0.1);z-index:100;max-height:320px;overflow-y:auto"></div>
      </div>
      <button class="btn btn-ghost" onmousedown="event.preventDefault();searchMarketTicker()" style="font-size:0.56rem;white-space:nowrap;padding:10px 16px">${tr?'Ara':'Search'}</button>
    </div>
  </div>
  <div id="mktSearchStatus" style="font-size:0.54rem;color:var(--muted);margin-bottom:4px"></div>
  <div id="mktSearchResult" style="margin-bottom:12px"></div>`;

  h+=`<div class="mkt-section" data-cat="Endeks">`+secTitle(tr?'Endeksler':'Indices')+renderGroup(MARKET_ITEMS.indices)+`</div>`;
  h+=`<div class="mkt-section" data-cat="BIST">`+secTitle(tr?'BIST Hisseler':'BIST Stocks')+renderGroup(MARKET_ITEMS.stocks)+`</div>`;
  h+=`<div class="mkt-section" data-cat="Emtia">`+secTitle(tr?'Emtia':'Commodities')+renderGroup(MARKET_ITEMS.commodities)+`</div>`;
  h+=`<div class="mkt-section" data-cat="Doviz">`+secTitle(tr?'Doviz':'Forex')+renderGroup(MARKET_ITEMS.fx)+`</div>`;
  h+=`<div class="mkt-section" data-cat="Kripto">`+secTitle(tr?'Kripto Paralar':'Cryptocurrencies')+renderGroup(MARKET_ITEMS.crypto)+`</div>`;

  h+=`<div style="font-size:0.52rem;color:var(--muted);margin-top:16px;text-align:center">${tr?'Kaynak: Yahoo Finance · Basar. olanlar her 60sn yeniden denenir · Linkler: Investing.com':'Source: Yahoo Finance · Failed items retry every 60s · Links: Investing.com'}</div>`;

  el.innerHTML=h;
  if(!mktFetching && okCount<allCount) fetchAllMarketPrices();
}

// ════════════════════════════════════════════════════════════════
// SAMPLE PORTFOLIO — Diversified benchmark portfolio for comparison
// ════════════════════════════════════════════════════════════════
