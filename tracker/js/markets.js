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
    // ═══ BIST 100 — Tam liste ═══
    // Bankalar
    {sym:'GARAN.IS',name:'GARAN',link:'https://www.investing.com/equities/garanti-bankasi'},
    {sym:'AKBNK.IS',name:'AKBNK',link:'https://www.investing.com/equities/akbank'},
    {sym:'YKBNK.IS',name:'YKBNK',link:'https://www.investing.com/equities/yapi-ve-kredi-bankasi'},
    {sym:'ISCTR.IS',name:'ISCTR',link:'https://www.investing.com/equities/turkiye-is-bankasi-c'},
    {sym:'HALKB.IS',name:'HALKB',link:'https://www.investing.com/equities/turkiye-halk-bankasi'},
    {sym:'VAKBN.IS',name:'VAKBN',link:'https://www.investing.com/equities/turkiye-vakiflar-bankasi'},
    {sym:'TSKB.IS',name:'TSKB',link:'https://www.investing.com/equities/turkiye-sinai-kalkinma-bank'},
    {sym:'ALBRK.IS',name:'ALBRK',link:'https://www.investing.com/equities/albaraka-turk'},
    {sym:'SKBNK.IS',name:'SKBNK',link:'https://www.investing.com/equities/sekerbank'},
    // Holdingler
    {sym:'KCHOL.IS',name:'KCHOL',link:'https://www.investing.com/equities/koc-holding'},
    {sym:'SAHOL.IS',name:'SAHOL',link:'https://www.investing.com/equities/haci-omer-sabanci-holding'},
    {sym:'DOHOL.IS',name:'DOHOL',link:'https://www.investing.com/equities/dogan-sirketler-grubu'},
    {sym:'TKFEN.IS',name:'TKFEN',link:'https://www.investing.com/equities/tekfen-holding'},
    {sym:'TAVHL.IS',name:'TAVHL',link:'https://www.investing.com/equities/tav-havalimanlari'},
    // Savunma & Havacılık
    {sym:'ASELS.IS',name:'ASELS',link:'https://www.investing.com/equities/aselsan'},
    {sym:'THYAO.IS',name:'THYAO',link:'https://www.investing.com/equities/turk-hava-yollari'},
    {sym:'PGSUS.IS',name:'PGSUS',link:'https://www.investing.com/equities/pegasus-hava-tasimaciligi'},
    // Otomotiv
    {sym:'FROTO.IS',name:'FROTO',link:'https://www.investing.com/equities/ford-otomotiv-sanayi'},
    {sym:'TOASO.IS',name:'TOASO',link:'https://www.investing.com/equities/tofas-turk-otomobil-fabrikasi'},
    {sym:'OTKAR.IS',name:'OTKAR',link:'https://www.investing.com/equities/otokar'},
    {sym:'TTRAK.IS',name:'TTRAK',link:'https://www.investing.com/equities/turk-traktor-ve-ziraat-makineleri'},
    // Enerji & Petrokimya
    {sym:'TUPRS.IS',name:'TUPRS',link:'https://www.investing.com/equities/tupras-turkiye-petrol-rafine'},
    {sym:'PETKM.IS',name:'PETKM',link:'https://www.investing.com/equities/petkim-petrokimya'},
    {sym:'ENJSA.IS',name:'ENJSA',link:'https://www.investing.com/equities/enerjisa-enerji'},
    {sym:'EUPWR.IS',name:'EUPWR',link:'https://www.investing.com/equities/euro-enerji'},
    {sym:'AKSEN.IS',name:'AKSEN',link:'https://www.investing.com/equities/aksa-enerji-uretim'},
    {sym:'AYGEN.IS',name:'AYGEN',link:'https://www.investing.com/equities/aydem-yenilenebilir-enerji'},
    {sym:'ODAS.IS',name:'ODAS',link:'https://www.investing.com/equities/odas-elektrik-uretim'},
    // Sanayi & İmalat
    {sym:'EREGL.IS',name:'EREGL',link:'https://www.investing.com/equities/eregli-demir-celik'},
    {sym:'SISE.IS',name:'SISE',link:'https://www.investing.com/equities/sise-cam'},
    {sym:'ARCLK.IS',name:'ARCLK',link:'https://www.investing.com/equities/arcelik'},
    {sym:'VESTL.IS',name:'VESTL',link:'https://www.investing.com/equities/vestel-elektronik'},
    {sym:'BRISA.IS',name:'BRISA',link:'https://www.investing.com/equities/brisa-bridgestone-sabanci'},
    {sym:'KRDMD.IS',name:'KRDMD',link:'https://www.investing.com/equities/kardemir-d'},
    {sym:'CEMTS.IS',name:'CEMTS',link:'https://www.investing.com/equities/cemas-dokum-sanayi'},
    {sym:'CIMSA.IS',name:'CIMSA',link:'https://www.investing.com/equities/cimsa-cimento-sanayi-ve-ticaret'},
    // İnşaat
    {sym:'ENKAI.IS',name:'ENKAI',link:'https://www.investing.com/equities/enka-insaat-ve-sanayi'},
    {sym:'EKGYO.IS',name:'EKGYO',link:'https://www.investing.com/equities/emlak-konut-gayrimenkul'},
    {sym:'ISGYO.IS',name:'ISGYO',link:'https://www.investing.com/equities/is-gayrimenkul-yatirim-ortakligi'},
    // Telekomünikasyon & Teknoloji
    {sym:'TCELL.IS',name:'TCELL',link:'https://www.investing.com/equities/turkcell-iletisim-hizmetleri'},
    {sym:'TTKOM.IS',name:'TTKOM',link:'https://www.investing.com/equities/turk-telekomunikasyon'},
    {sym:'LOGO.IS',name:'LOGO',link:'https://www.investing.com/equities/logo-yazilim'},
    {sym:'NETAS.IS',name:'NETAS',link:'https://www.investing.com/equities/netas-telekomunikasyon'},
    {sym:'KONTR.IS',name:'KONTR',link:'https://www.investing.com/equities/kontrolmatik-teknoloji'},
    // Perakende & Gıda
    {sym:'BIMAS.IS',name:'BIMAS',link:'https://www.investing.com/equities/bim-birlesik-magazalar'},
    {sym:'MGROS.IS',name:'MGROS',link:'https://www.investing.com/equities/migros-ticaret'},
    {sym:'SOKM.IS',name:'SOKM',link:'https://www.investing.com/equities/sok-marketler-ticaret'},
    {sym:'ULKER.IS',name:'ULKER',link:'https://www.investing.com/equities/ulker-biskuvi-sanayi'},
    {sym:'AEFES.IS',name:'AEFES',link:'https://www.investing.com/equities/anadolu-efes'},
    {sym:'CCOLA.IS',name:'CCOLA',link:'https://www.investing.com/equities/coca-cola-icecek'},
    {sym:'TATGD.IS',name:'TATGD',link:'https://www.investing.com/equities/tat-gida-sanayi'},
    {sym:'BANVT.IS',name:'BANVT',link:'https://www.investing.com/equities/banvit-bandirma-vitaminli-yem'},
    // Tekstil & Moda
    {sym:'MAVI.IS',name:'MAVI',link:'https://www.investing.com/equities/mavi-giyim-sanayi-ve-ticaret'},
    // Madencilik
    {sym:'KOZAL.IS',name:'KOZAL',link:'https://www.investing.com/equities/koza-altin-isletmeleri'},
    {sym:'KOZAA.IS',name:'KOZAA',link:'https://www.investing.com/equities/koza-anadolu-metal'},
    // Kimya & Gübre
    {sym:'SASA.IS',name:'SASA',link:'https://www.investing.com/equities/sasa-polyester-sanayi'},
    {sym:'GUBRF.IS',name:'GUBRF',link:'https://www.investing.com/equities/gubre-fabrikalari'},
    // Sigorta & Finans
    {sym:'AKGRT.IS',name:'AKGRT',link:'https://www.investing.com/equities/aksigorta'},
    {sym:'ANHYT.IS',name:'ANHYT',link:'https://www.investing.com/equities/anadolu-hayat-emeklilik'},
    {sym:'AGESA.IS',name:'AGESA',link:'https://www.investing.com/equities/agesa-hayat-ve-emeklilik'},
    // Sağlık
    {sym:'MPARK.IS',name:'MPARK',link:'https://www.investing.com/equities/mlp-saglik-hizmetleri'},
    // Diğer BIST-100
    {sym:'PRKME.IS',name:'PRKME',link:'https://www.investing.com/equities/park-elektrik-uretim'},
    {sym:'GESAN.IS',name:'GESAN',link:'https://www.investing.com/equities/girisim-elektrik'},
    {sym:'BERA.IS',name:'BERA',link:'https://www.investing.com/equities/bera-holding'},
    {sym:'EGEEN.IS',name:'EGEEN',link:'https://www.investing.com/equities/ege-endustri-ve-ticaret'},
    {sym:'OYAKC.IS',name:'OYAKC',link:'https://www.investing.com/equities/oyak-cimento'},
    {sym:'ISMEN.IS',name:'ISMEN',link:'https://www.investing.com/equities/is-yatirim-menkul-degerler'},
    {sym:'AKFGY.IS',name:'AKFGY',link:'https://www.investing.com/equities/akfen-gayrimenkul-yatirim'},
    {sym:'TURSG.IS',name:'TURSG',link:'https://www.investing.com/equities/turk-sigorta'},
    {sym:'KLSER.IS',name:'KLSER',link:'https://www.investing.com/equities/kalyon-enerji'},
    {sym:'KAYSE.IS',name:'KAYSE',link:'https://www.investing.com/equities/kayseri-seker-fabrikasi'},
    {sym:'KARSN.IS',name:'KARSN',link:'https://www.investing.com/equities/karsan-otomotiv'},
    {sym:'SARKY.IS',name:'SARKY',link:'https://www.investing.com/equities/sarkuysan'},
    {sym:'AYDEM.IS',name:'AYDEM',link:'https://www.investing.com/equities/aydem-enerji'},
    {sym:'REEDR.IS',name:'REEDR',link:'https://www.investing.com/equities/reeder-teknoloji'},
    {sym:'ALFAS.IS',name:'ALFAS',link:'https://www.investing.com/equities/alfa-solar-enerji'},
    {sym:'CWENE.IS',name:'CWENE',link:'https://www.investing.com/equities/cw-enerji'},
    {sym:'HEKTS.IS',name:'HEKTS',link:'https://www.investing.com/equities/hektas-ticaret'},
    {sym:'SMRTG.IS',name:'SMRTG',link:'https://www.investing.com/equities/smart-gunes-enerjisi'},
    {sym:'ARDYZ.IS',name:'ARDYZ',link:'https://www.investing.com/equities/arti-teknoloji'},
    {sym:'TMSN.IS',name:'TMSN',link:'https://www.investing.com/equities/tumosan-motor-ve-traktor'},
    {sym:'INDES.IS',name:'INDES',link:'https://www.investing.com/equities/indeks-bilgisayar'},
    {sym:'ALARK.IS',name:'ALARK',link:'https://www.investing.com/equities/alarko-holding'},
    {sym:'ASTOR.IS',name:'ASTOR',link:'https://www.investing.com/equities/astor-enerji'},
    {sym:'KCAER.IS',name:'KCAER',link:'https://www.investing.com/equities/kocaer-celik-sanayi'},
    {sym:'MIATK.IS',name:'MIATK',link:'https://www.investing.com/equities/mia-teknoloji'},
    {sym:'AKFYE.IS',name:'AKFYE',link:'https://www.investing.com/equities/akfen-yenilenebilir-enerji'},
    {sym:'BIOEN.IS',name:'BIOEN',link:'https://www.investing.com/equities/biotrend-cevre-ve-enerji'},
    {sym:'BTCIM.IS',name:'BTCIM',link:'https://www.investing.com/equities/bati-cimento'},
    {sym:'BUCIM.IS',name:'BUCIM',link:'https://www.investing.com/equities/bursa-cimento-fabrikasi'},
    {sym:'CANTE.IS',name:'CANTE',link:'https://www.investing.com/equities/canakkale-seramik'},
    {sym:'DOAS.IS',name:'DOAS',link:'https://www.investing.com/equities/dogus-otomotiv'},
    {sym:'ECILC.IS',name:'ECILC',link:'https://www.investing.com/equities/eczacibasi-ilac'},
    {sym:'GEDZA.IS',name:'GEDZA',link:'https://www.investing.com/equities/gediz-ambalaj'},
    {sym:'GLYHO.IS',name:'GLYHO',link:'https://www.investing.com/equities/global-yatirim-holding'},
    {sym:'KORDS.IS',name:'KORDS',link:'https://www.investing.com/equities/kordsa-teknik-tekstil'},
    {sym:'PAPIL.IS',name:'PAPIL',link:'https://www.investing.com/equities/papilon-savunma'},
    {sym:'ERSEN.IS',name:'ERSEN',link:'https://www.investing.com/equities/ersu-gida'},
    {sym:'QUAGR.IS',name:'QUAGR',link:'https://www.investing.com/equities/qua-granite'},
    {sym:'SUNTK.IS',name:'SUNTK',link:'https://www.investing.com/equities/sun-tekstil'},
    {sym:'VESBE.IS',name:'VESBE',link:'https://www.investing.com/equities/vestel-beyaz-esya'},
    {sym:'YEOTK.IS',name:'YEOTK',link:'https://www.investing.com/equities/yeo-teknoloji'},
  ],
  us_stocks: [
    {sym:'AAPL',name:'Apple',link:'https://www.investing.com/equities/apple-computer-inc'},
    {sym:'MSFT',name:'Microsoft',link:'https://www.investing.com/equities/microsoft-corp'},
    {sym:'NVDA',name:'NVIDIA',link:'https://www.investing.com/equities/nvidia-corp'},
    {sym:'GOOGL',name:'Alphabet',link:'https://www.investing.com/equities/alphabet-inc'},
    {sym:'AMZN',name:'Amazon',link:'https://www.investing.com/equities/amazon-com-inc'},
    {sym:'TSLA',name:'Tesla',link:'https://www.investing.com/equities/tesla-motors'},
    {sym:'META',name:'Meta',link:'https://www.investing.com/equities/facebook-inc'},
    {sym:'AVGO',name:'Broadcom',link:'https://www.investing.com/equities/broadcom-ltd'},
    {sym:'JPM',name:'JPMorgan',link:'https://www.investing.com/equities/jp-morgan-chase'},
    {sym:'LLY',name:'Eli Lilly',link:'https://www.investing.com/equities/eli-lilly-and-co'},
    {sym:'V',name:'Visa',link:'https://www.investing.com/equities/visa-inc'},
    {sym:'NFLX',name:'Netflix',link:'https://www.investing.com/equities/netflix,-inc.'},
    {sym:'AMD',name:'AMD',link:'https://www.investing.com/equities/adv-micro-devices'},
    {sym:'PLTR',name:'Palantir',link:'https://www.investing.com/equities/palantir-technologies-inc'},
    {sym:'BA',name:'Boeing',link:'https://www.investing.com/equities/boeing-co'},
    {sym:'DIS',name:'Disney',link:'https://www.investing.com/equities/walt-disney'},
    {sym:'COIN',name:'Coinbase',link:'https://www.investing.com/equities/coinbase-global-inc'},
    {sym:'NKE',name:'Nike',link:'https://www.investing.com/equities/nike'},
    {sym:'SBUX',name:'Starbucks',link:'https://www.investing.com/equities/starbucks-corp'},
    {sym:'INTC',name:'Intel',link:'https://www.investing.com/equities/intel-corp'},
  ],
  eu_stocks: [
    {sym:'ASML',name:'ASML',link:'https://www.investing.com/equities/asml-hld'},
    {sym:'MC.PA',name:'LVMH',link:'https://www.investing.com/equities/lvmh'},
    {sym:'SAP',name:'SAP',link:'https://www.investing.com/equities/sap-ag'},
    {sym:'SIE.DE',name:'Siemens',link:'https://www.investing.com/equities/siemens-ag'},
    {sym:'BMW.DE',name:'BMW',link:'https://www.investing.com/equities/bayerische-motoren-werke'},
    {sym:'AIR.PA',name:'Airbus',link:'https://www.investing.com/equities/airbus-group'},
    {sym:'SHEL',name:'Shell',link:'https://www.investing.com/equities/shell-plc'},
    {sym:'AZN',name:'AstraZeneca',link:'https://www.investing.com/equities/astrazeneca'},
    {sym:'VOW3.DE',name:'Volkswagen',link:'https://www.investing.com/equities/volkswagen-ag-vzo'},
    {sym:'BAS.DE',name:'BASF',link:'https://www.investing.com/equities/basf'},
  ],
  commodities: [
    {sym:'GC=F',name:{tr:'Altin (Ons)',en:'Gold (Oz)'},link:'https://www.investing.com/commodities/gold'},
    {sym:'SI=F',name:{tr:'Gumus',en:'Silver'},link:'https://www.investing.com/commodities/silver'},
    {sym:'CL=F',name:{tr:'Petrol (WTI)',en:'Oil (WTI)'},link:'https://www.investing.com/commodities/crude-oil'},
    {sym:'NG=F',name:{tr:'Dogalgaz',en:'Nat. Gas'},link:'https://www.investing.com/commodities/natural-gas'},
    {sym:'PL=F',name:{tr:'Platin',en:'Platinum'},link:'https://www.investing.com/commodities/platinum'},
    {sym:'HG=F',name:{tr:'Bakir',en:'Copper'},link:'https://www.investing.com/commodities/copper'},
    {sym:'CT=F',name:{tr:'Pamuk',en:'Cotton'},link:'https://www.investing.com/commodities/us-cotton-no.2'},
    {sym:'KC=F',name:{tr:'Kahve',en:'Coffee'},link:'https://www.investing.com/commodities/us-coffee-c'},
  ],
  fx: [
    {sym:'USDTRY=X',name:'USD/TRY',link:'https://www.investing.com/currencies/usd-try'},
    {sym:'EURTRY=X',name:'EUR/TRY',link:'https://www.investing.com/currencies/eur-try'},
    {sym:'GBPTRY=X',name:'GBP/TRY',link:'https://www.investing.com/currencies/gbp-try'},
    {sym:'EURUSD=X',name:'EUR/USD',link:'https://www.investing.com/currencies/eur-usd'},
    {sym:'GBPUSD=X',name:'GBP/USD',link:'https://www.investing.com/currencies/gbp-usd'},
    {sym:'USDJPY=X',name:'USD/JPY',link:'https://www.investing.com/currencies/usd-jpy'},
    {sym:'USDCHF=X',name:'USD/CHF',link:'https://www.investing.com/currencies/usd-chf'},
    {sym:'AUDUSD=X',name:'AUD/USD',link:'https://www.investing.com/currencies/aud-usd'},
  ],
  crypto: [
    {sym:'BTC-USD',name:'Bitcoin',link:'https://www.investing.com/crypto/bitcoin'},
    {sym:'ETH-USD',name:'Ethereum',link:'https://www.investing.com/crypto/ethereum'},
    {sym:'SOL-USD',name:'Solana',link:'https://www.investing.com/crypto/solana'},
    {sym:'XRP-USD',name:'XRP',link:'https://www.investing.com/crypto/xrp'},
    {sym:'ADA-USD',name:'Cardano',link:'https://www.investing.com/crypto/cardano'},
    {sym:'AVAX-USD',name:'Avalanche',link:'https://www.investing.com/crypto/avalanche'},
    {sym:'DOGE-USD',name:'Dogecoin',link:'https://www.investing.com/crypto/dogecoin'},
    {sym:'BNB-USD',name:'BNB',link:'https://www.investing.com/crypto/bnb'},
    {sym:'DOT-USD',name:'Polkadot',link:'https://www.investing.com/crypto/polkadot'},
    {sym:'LINK-USD',name:'Chainlink',link:'https://www.investing.com/crypto/chainlink'},
    {sym:'NEAR-USD',name:'NEAR',link:'https://www.investing.com/crypto/near-protocol'},
    {sym:'ARB-USD',name:'Arbitrum',link:'https://www.investing.com/crypto/arbitrum'},
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
  // ═══ US Stocks (40+) ═══
  {sym:'AAPL',name:'Apple',cat:'US'},{sym:'TSLA',name:'Tesla',cat:'US'},{sym:'MSFT',name:'Microsoft',cat:'US'},
  {sym:'GOOGL',name:'Alphabet Google',cat:'US'},{sym:'AMZN',name:'Amazon',cat:'US'},{sym:'NVDA',name:'NVIDIA',cat:'US'},
  {sym:'META',name:'Meta Facebook',cat:'US'},{sym:'NFLX',name:'Netflix',cat:'US'},{sym:'AMD',name:'AMD',cat:'US'},
  {sym:'INTC',name:'Intel',cat:'US'},{sym:'CRM',name:'Salesforce',cat:'US'},{sym:'PYPL',name:'PayPal',cat:'US'},
  {sym:'DIS',name:'Walt Disney',cat:'US'},{sym:'BA',name:'Boeing',cat:'US'},{sym:'JPM',name:'JPMorgan Chase',cat:'US'},
  {sym:'V',name:'Visa',cat:'US'},{sym:'MA',name:'Mastercard',cat:'US'},{sym:'KO',name:'Coca-Cola',cat:'US'},
  {sym:'PEP',name:'PepsiCo',cat:'US'},{sym:'WMT',name:'Walmart',cat:'US'},{sym:'COST',name:'Costco',cat:'US'},
  {sym:'UBER',name:'Uber Technologies',cat:'US'},{sym:'ABNB',name:'Airbnb',cat:'US'},{sym:'SQ',name:'Block Square',cat:'US'},
  {sym:'SHOP',name:'Shopify',cat:'US'},{sym:'SNOW',name:'Snowflake',cat:'US'},{sym:'PLTR',name:'Palantir',cat:'US'},
  {sym:'COIN',name:'Coinbase',cat:'US'},{sym:'RIVN',name:'Rivian Automotive',cat:'US'},{sym:'LCID',name:'Lucid Motors',cat:'US'},
  {sym:'NIO',name:'NIO Electric Vehicles',cat:'US'},{sym:'BABA',name:'Alibaba',cat:'US'},{sym:'JD',name:'JD.com',cat:'US'},
  {sym:'TSM',name:'Taiwan Semiconductor TSMC',cat:'US'},{sym:'ASML',name:'ASML Holdings',cat:'US'},
  {sym:'ARM',name:'ARM Holdings',cat:'US'},{sym:'AVGO',name:'Broadcom',cat:'US'},{sym:'QCOM',name:'Qualcomm',cat:'US'},
  {sym:'MU',name:'Micron Technology',cat:'US'},{sym:'DELL',name:'Dell Technologies',cat:'US'},
  {sym:'ORCL',name:'Oracle',cat:'US'},{sym:'IBM',name:'IBM',cat:'US'},{sym:'CSCO',name:'Cisco Systems',cat:'US'},
  {sym:'GS',name:'Goldman Sachs',cat:'US'},{sym:'MS',name:'Morgan Stanley',cat:'US'},{sym:'BAC',name:'Bank of America',cat:'US'},
  {sym:'C',name:'Citigroup',cat:'US'},{sym:'WFC',name:'Wells Fargo',cat:'US'},{sym:'BRK-B',name:'Berkshire Hathaway',cat:'US'},
  {sym:'XOM',name:'ExxonMobil',cat:'US'},{sym:'CVX',name:'Chevron',cat:'US'},{sym:'JNJ',name:'Johnson & Johnson',cat:'US'},
  {sym:'PFE',name:'Pfizer',cat:'US'},{sym:'UNH',name:'UnitedHealth',cat:'US'},{sym:'LLY',name:'Eli Lilly',cat:'US'},
  {sym:'ABBV',name:'AbbVie',cat:'US'},{sym:'MRK',name:'Merck',cat:'US'},{sym:'NKE',name:'Nike',cat:'US'},
  {sym:'SBUX',name:'Starbucks',cat:'US'},{sym:'MCD',name:'McDonalds',cat:'US'},
  // ═══ EU Stocks ═══
  {sym:'SAP',name:'SAP SE',cat:'EU'},{sym:'ASML',name:'ASML',cat:'EU'},{sym:'MC.PA',name:'LVMH',cat:'EU'},
  {sym:'SIE.DE',name:'Siemens',cat:'EU'},{sym:'BAS.DE',name:'BASF',cat:'EU'},{sym:'BMW.DE',name:'BMW',cat:'EU'},
  {sym:'VOW3.DE',name:'Volkswagen',cat:'EU'},{sym:'AIR.PA',name:'Airbus',cat:'EU'},
  {sym:'SHEL',name:'Shell',cat:'EU'},{sym:'BP',name:'BP',cat:'EU'},{sym:'AZN',name:'AstraZeneca',cat:'EU'},
  // ═══ BIST Stocks (90+) ═══
  {sym:'THYAO.IS',name:'Turk Hava Yollari THY',cat:'BIST'},{sym:'ASELS.IS',name:'ASELSAN Savunma',cat:'BIST'},
  {sym:'GARAN.IS',name:'Garanti BBVA Bankasi',cat:'BIST'},{sym:'AKBNK.IS',name:'Akbank',cat:'BIST'},
  {sym:'YKBNK.IS',name:'Yapi Kredi Bankasi',cat:'BIST'},{sym:'ISCTR.IS',name:'Is Bankasi',cat:'BIST'},
  {sym:'HALKB.IS',name:'Halkbank',cat:'BIST'},{sym:'VAKBN.IS',name:'Vakifbank',cat:'BIST'},
  {sym:'TSKB.IS',name:'TSKB Kalkinma Bankasi',cat:'BIST'},{sym:'ALBRK.IS',name:'Albaraka Turk',cat:'BIST'},
  {sym:'SKBNK.IS',name:'Sekerbank',cat:'BIST'},
  {sym:'KCHOL.IS',name:'Koc Holding',cat:'BIST'},{sym:'SAHOL.IS',name:'Sabanci Holding',cat:'BIST'},
  {sym:'DOHOL.IS',name:'Dogan Holding',cat:'BIST'},{sym:'TKFEN.IS',name:'Tekfen Holding',cat:'BIST'},
  {sym:'TAVHL.IS',name:'TAV Havalimanlari',cat:'BIST'},{sym:'PGSUS.IS',name:'Pegasus Havacilik',cat:'BIST'},
  {sym:'FROTO.IS',name:'Ford Otosan',cat:'BIST'},{sym:'TOASO.IS',name:'Tofas Oto',cat:'BIST'},
  {sym:'OTKAR.IS',name:'Otokar Savunma',cat:'BIST'},{sym:'TTRAK.IS',name:'Turk Traktor',cat:'BIST'},
  {sym:'TUPRS.IS',name:'Tupras Petrol Rafineri',cat:'BIST'},{sym:'PETKM.IS',name:'Petkim Kimya',cat:'BIST'},
  {sym:'ENJSA.IS',name:'Enerjisa Enerji',cat:'BIST'},{sym:'EUPWR.IS',name:'EuroEnergy',cat:'BIST'},
  {sym:'AKSEN.IS',name:'Aksa Enerji',cat:'BIST'},{sym:'AYGEN.IS',name:'Aydem Yenilenebilir',cat:'BIST'},
  {sym:'ODAS.IS',name:'Odas Elektrik',cat:'BIST'},
  {sym:'EREGL.IS',name:'Eregli Demir Celik',cat:'BIST'},{sym:'SISE.IS',name:'Sisecam',cat:'BIST'},
  {sym:'ARCLK.IS',name:'Arcelik',cat:'BIST'},{sym:'VESTL.IS',name:'Vestel Elektronik',cat:'BIST'},
  {sym:'BRISA.IS',name:'Brisa Bridgestone',cat:'BIST'},{sym:'KRDMD.IS',name:'Kardemir Demir Celik',cat:'BIST'},
  {sym:'CIMSA.IS',name:'Cimsa Cimento',cat:'BIST'},
  {sym:'ENKAI.IS',name:'Enka Insaat',cat:'BIST'},{sym:'EKGYO.IS',name:'Emlak Konut GYO',cat:'BIST'},
  {sym:'ISGYO.IS',name:'Is GYO Gayrimenkul',cat:'BIST'},
  {sym:'TCELL.IS',name:'Turkcell Iletisim',cat:'BIST'},{sym:'TTKOM.IS',name:'Turk Telekom',cat:'BIST'},
  {sym:'LOGO.IS',name:'Logo Yazilim',cat:'BIST'},{sym:'NETAS.IS',name:'Netas Telekom',cat:'BIST'},
  {sym:'KONTR.IS',name:'Kontrolmatik Teknoloji',cat:'BIST'},
  {sym:'BIMAS.IS',name:'BIM Magazalar',cat:'BIST'},{sym:'MGROS.IS',name:'Migros Ticaret',cat:'BIST'},
  {sym:'SOKM.IS',name:'Sok Marketler',cat:'BIST'},{sym:'ULKER.IS',name:'Ulker Biskuvi',cat:'BIST'},
  {sym:'AEFES.IS',name:'Anadolu Efes Bira',cat:'BIST'},{sym:'CCOLA.IS',name:'Coca Cola Icecek',cat:'BIST'},
  {sym:'TATGD.IS',name:'Tat Gida',cat:'BIST'},{sym:'BANVT.IS',name:'Banvit Tavukculuk',cat:'BIST'},
  {sym:'MAVI.IS',name:'Mavi Giyim',cat:'BIST'},{sym:'KOZAL.IS',name:'Koza Altin Madencilik',cat:'BIST'},
  {sym:'KOZAA.IS',name:'Koza Anadolu Metal',cat:'BIST'},
  {sym:'SASA.IS',name:'SASA Polyester',cat:'BIST'},{sym:'GUBRF.IS',name:'Gubre Fabrikalari',cat:'BIST'},
  {sym:'AKGRT.IS',name:'Aksigorta',cat:'BIST'},{sym:'ANHYT.IS',name:'Anadolu Hayat Emeklilik',cat:'BIST'},
  {sym:'AGESA.IS',name:'Agesa Emeklilik',cat:'BIST'},{sym:'MPARK.IS',name:'MLP Saglik',cat:'BIST'},
  {sym:'GESAN.IS',name:'Girisim Elektrik',cat:'BIST'},{sym:'BERA.IS',name:'Bera Holding',cat:'BIST'},
  {sym:'EGEEN.IS',name:'Ege Endustri',cat:'BIST'},{sym:'OYAKC.IS',name:'Oyak Cimento',cat:'BIST'},
  {sym:'ISMEN.IS',name:'Is Yatirim Menkul',cat:'BIST'},{sym:'TURSG.IS',name:'Turk Sigorta',cat:'BIST'},
  {sym:'KARSN.IS',name:'Karsan Otomotiv',cat:'BIST'},{sym:'SARKY.IS',name:'Sarkuysan Kablo',cat:'BIST'},
  {sym:'AYDEM.IS',name:'Aydem Enerji',cat:'BIST'},{sym:'REEDR.IS',name:'Reeder Teknoloji',cat:'BIST'},
  {sym:'ALFAS.IS',name:'Alfa Solar Enerji',cat:'BIST'},{sym:'CWENE.IS',name:'CW Enerji',cat:'BIST'},
  {sym:'HEKTS.IS',name:'Hektas Ticaret',cat:'BIST'},{sym:'ASTOR.IS',name:'Astor Enerji',cat:'BIST'},
  {sym:'DOAS.IS',name:'Dogus Otomotiv',cat:'BIST'},{sym:'KORDS.IS',name:'Kordsa Tekstil',cat:'BIST'},
  {sym:'VESBE.IS',name:'Vestel Beyaz Esya',cat:'BIST'},{sym:'ALARK.IS',name:'Alarko Holding',cat:'BIST'},
  {sym:'INDES.IS',name:'Indeks Bilgisayar',cat:'BIST'},{sym:'PAPIL.IS',name:'Papilon Savunma',cat:'BIST'},
  {sym:'BIOEN.IS',name:'Biotrend Enerji',cat:'BIST'},{sym:'MIATK.IS',name:'MIA Teknoloji',cat:'BIST'},
  {sym:'YEOTK.IS',name:'YEO Teknoloji',cat:'BIST'},{sym:'SMRTG.IS',name:'Smart Gunes Enerjisi',cat:'BIST'},
  // ═══ Crypto (15+) ═══
  {sym:'BTC-USD',name:'Bitcoin BTC',cat:'Kripto'},{sym:'ETH-USD',name:'Ethereum ETH',cat:'Kripto'},
  {sym:'SOL-USD',name:'Solana SOL',cat:'Kripto'},{sym:'XRP-USD',name:'XRP Ripple',cat:'Kripto'},
  {sym:'ADA-USD',name:'Cardano ADA',cat:'Kripto'},{sym:'AVAX-USD',name:'Avalanche AVAX',cat:'Kripto'},
  {sym:'DOGE-USD',name:'Dogecoin DOGE',cat:'Kripto'},{sym:'BNB-USD',name:'BNB Binance',cat:'Kripto'},
  {sym:'DOT-USD',name:'Polkadot DOT',cat:'Kripto'},{sym:'MATIC-USD',name:'Polygon MATIC',cat:'Kripto'},
  {sym:'LINK-USD',name:'Chainlink LINK',cat:'Kripto'},{sym:'UNI-USD',name:'Uniswap UNI',cat:'Kripto'},
  {sym:'SHIB-USD',name:'Shiba Inu SHIB',cat:'Kripto'},{sym:'ATOM-USD',name:'Cosmos ATOM',cat:'Kripto'},
  {sym:'NEAR-USD',name:'NEAR Protocol',cat:'Kripto'},{sym:'APT-USD',name:'Aptos APT',cat:'Kripto'},
  {sym:'ARB-USD',name:'Arbitrum ARB',cat:'Kripto'},{sym:'OP-USD',name:'Optimism OP',cat:'Kripto'},
  // ═══ Emtia & Doviz ═══
  {sym:'GC=F',name:'Altin Gold Futures',cat:'Emtia'},{sym:'SI=F',name:'Gumus Silver',cat:'Emtia'},
  {sym:'CL=F',name:'Petrol Crude Oil WTI',cat:'Emtia'},{sym:'NG=F',name:'Dogalgaz Natural Gas',cat:'Emtia'},
  {sym:'PL=F',name:'Platin Platinum',cat:'Emtia'},{sym:'HG=F',name:'Bakir Copper',cat:'Emtia'},
  {sym:'CT=F',name:'Pamuk Cotton',cat:'Emtia'},{sym:'KC=F',name:'Kahve Coffee',cat:'Emtia'},
  {sym:'USDTRY=X',name:'Dolar TL USD/TRY',cat:'Doviz'},{sym:'EURTRY=X',name:'Euro TL EUR/TRY',cat:'Doviz'},
  {sym:'GBPTRY=X',name:'Sterlin TL GBP/TRY',cat:'Doviz'},{sym:'EURUSD=X',name:'Euro Dolar EUR/USD',cat:'Doviz'},
  {sym:'GBPUSD=X',name:'Sterlin Dolar GBP/USD',cat:'Doviz'},{sym:'USDJPY=X',name:'Dolar Yen USD/JPY',cat:'Doviz'},
  {sym:'USDCHF=X',name:'Dolar Frank USD/CHF',cat:'Doviz'},{sym:'AUDUSD=X',name:'Avustralya Dolari AUD/USD',cat:'Doviz'},
  // ═══ ETF ═══
  {sym:'SPY',name:'SPDR S&P 500 ETF',cat:'ETF'},{sym:'QQQ',name:'Invesco QQQ NASDAQ ETF',cat:'ETF'},
  {sym:'TLT',name:'iShares 20+ Year Treasury',cat:'ETF'},{sym:'GLD',name:'SPDR Gold Shares',cat:'ETF'},
  {sym:'DJIST.IS',name:'DJIST BIST-100 ETF',cat:'ETF'},{sym:'IWM',name:'iShares Russell 2000',cat:'ETF'},
  {sym:'VTI',name:'Vanguard Total Stock Market',cat:'ETF'},{sym:'EEM',name:'iShares MSCI Emerging',cat:'ETF'},
  {sym:'VOO',name:'Vanguard S&P 500',cat:'ETF'},{sym:'ARKK',name:'ARK Innovation ETF',cat:'ETF'},
];

let mktDDOpen=false;
let bistExpanded=false;
function toggleBistAll(){
  const el=document.getElementById('mktStocksMore');
  const btn=document.getElementById('mktStocksToggle');
  if(!el||!btn) return;
  bistExpanded=!bistExpanded;
  el.style.display=bistExpanded?'block':'none';
  btn.textContent=bistExpanded?(LANG==='tr'?'Daralt':'Collapse'):(LANG==='tr'?'Tumu Goster ('+MARKET_ITEMS.stocks.length+' hisse)':'Show All ('+MARKET_ITEMS.stocks.length+' stocks)');
  if(bistExpanded&&!mktFetching) fetchAllMarketPrices();
}

function onMktSearch(val){
  const dd=document.getElementById('mktSearchDD');
  if(!dd) return;
  if(!val||val.length<1){dd.innerHTML='';dd.style.display='none';mktDDOpen=false;return;}
  const q=val.toUpperCase();
  const matches=SEARCH_SUGGESTIONS.filter(s=>
    s.sym.toUpperCase().includes(q)||s.name.toUpperCase().includes(q)
  ).slice(0,8);
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

  h+=secTitle(tr?'Endeksler':'Indices');
  h+=renderGroup(MARKET_ITEMS.indices);
  h+=secTitle(tr?'BIST 100 Hisseler':'BIST 100 Stocks');
  const stocksInitial=MARKET_ITEMS.stocks.slice(0,20);
  const stocksRest=MARKET_ITEMS.stocks.slice(20);
  h+=renderGroup(stocksInitial);
  if(stocksRest.length>0){
    h+=`<div id="mktStocksMore" style="display:none">`;
    h+=renderGroup(stocksRest);
    h+=`</div>`;
    h+=`<button id="mktStocksToggle" class="btn btn-ghost" onclick="toggleBistAll()" style="font-size:0.56rem;margin:10px auto;display:block;padding:8px 24px">${tr?'Tumu Goster ('+MARKET_ITEMS.stocks.length+' hisse)':'Show All ('+MARKET_ITEMS.stocks.length+' stocks)'}</button>`;
  }
  // ABD Hisseleri
  h+=secTitle(tr?'ABD Hisseleri ('+MARKET_ITEMS.us_stocks.length+')':'US Stocks ('+MARKET_ITEMS.us_stocks.length+')');
  h+=renderGroup(MARKET_ITEMS.us_stocks);

  // Avrupa Hisseleri
  h+=secTitle(tr?'Avrupa Hisseleri ('+MARKET_ITEMS.eu_stocks.length+')':'EU Stocks ('+MARKET_ITEMS.eu_stocks.length+')');
  h+=renderGroup(MARKET_ITEMS.eu_stocks);

  h+=secTitle(tr?'Emtia ('+MARKET_ITEMS.commodities.length+')':'Commodities ('+MARKET_ITEMS.commodities.length+')');
  h+=renderGroup(MARKET_ITEMS.commodities);
  h+=secTitle(tr?'Doviz ('+MARKET_ITEMS.fx.length+')':'Forex ('+MARKET_ITEMS.fx.length+')');
  h+=renderGroup(MARKET_ITEMS.fx);
  h+=secTitle(tr?'Kripto Paralar ('+MARKET_ITEMS.crypto.length+')':'Cryptocurrencies ('+MARKET_ITEMS.crypto.length+')');
  h+=renderGroup(MARKET_ITEMS.crypto);

  const totalAll=Object.values(MARKET_ITEMS).flat().length;
  h+=`<div style="font-size:0.52rem;color:var(--muted);margin-top:16px;text-align:center">${tr?'Toplam '+totalAll+' enstruman · Kaynak: Yahoo Finance · Linkler: Investing.com':'Total '+totalAll+' instruments · Source: Yahoo Finance · Links: Investing.com'}</div>`;

  el.innerHTML=h;
  if(!mktFetching && okCount<allCount) fetchAllMarketPrices();
}

// ════════════════════════════════════════════════════════════════
// SAMPLE PORTFOLIO — Diversified benchmark portfolio for comparison
// ════════════════════════════════════════════════════════════════
