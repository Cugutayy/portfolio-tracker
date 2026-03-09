const INSTRS = [
  { id:'btc', name:{tr:'Bitcoin (BTC)',en:'Bitcoin (BTC)'}, ticker:'BTC/TRY', tag:{tr:'Kripto Para',en:'Crypto'}, tc:'br', w:40, alloc:40000, buyPrice:2990000, unit:{tr:'TL/BTC',en:'TL/BTC'}, desc:{tr:'Binance BTC/TRY spot',en:'Binance BTC/TRY spot'}, color:'#e67e22', esg:{e:2,s:3,g:2},
    link:'https://www.investing.com/crypto/bitcoin/btc-try' },
  { id:'thyao', name:{tr:'THYAO — Türk Hava Yolları',en:'THYAO — Turkish Airlines'}, ticker:'THYAO.IS', tag:{tr:'Geleneksel Hisse',en:'Equity'}, tc:'bg', w:12, alloc:12000, buyPrice:342.50, unit:{tr:'TL/hisse',en:'TL/share'}, desc:{tr:'BIST 30',en:'BIST 30'}, color:'#c0392b', esg:{e:2,s:4,g:4},
    link:'https://www.investing.com/equities/turk-hava-yollari' },
  { id:'asels', name:{tr:'ASELSAN',en:'ASELSAN'}, ticker:'ASELS.IS', tag:{tr:'Sürd. Hisse',en:'Sustain. Equity'}, tc:'bg', w:8, alloc:8000, buyPrice:295.00, unit:{tr:'TL/hisse',en:'TL/share'}, desc:{tr:'BIST Sürdürülebilirlik Endeksi',en:'BIST Sustainability Index'}, color:'#1a472a', esg:{e:3,s:3,g:4},
    link:'https://www.investing.com/equities/aselsan' },
  { id:'gold', name:{tr:'Gram Altın',en:'Gold (gram)'}, ticker:'XAU/TRY', tag:{tr:'Kıymetli Maden',en:'Precious Metal'}, tc:'bgo', w:12, alloc:12000, buyPrice:6904, unit:{tr:'TL/gram',en:'TL/gram'}, desc:{tr:'Kapalıçarşı gram altın',en:'Grand Bazaar gram gold'}, color:'#c9a84c', esg:{e:2,s:3,g:3},
    link:'https://www.investing.com/currencies/gau-try' },
  { id:'bond', name:{tr:'Devlet Tahvili (2Y)',en:'Govt Bond (2Y)'}, ticker:'DİBS 2Y', tag:{tr:'Tahvil',en:'Bond'}, tc:'bb', w:10, alloc:10000, buyPrice:100, unit:{tr:'nominal',en:'nominal'}, desc:{tr:'2Y DİBS — kupon ~%30 yıllık · Nominal bazlı (100 TL + günlük tahakkuk)',en:'2Y Govt Bond — ~30% coupon · Nominal based (100 TL + daily accrual)'}, color:'#1d4ed8', esg:{e:3,s:4,g:5},
    link:'https://www.investing.com/rates-bonds/turkey-2-year-bond-yield' },
  { id:'fund', name:{tr:'İş Portföy Sürd. Hisse',en:'İş Portföy Sust. Equity'}, ticker:'BIO (TEFAS)', tag:{tr:'Yatırım Fonu',en:'Mutual Fund'}, tc:'bp', w:8, alloc:8000, buyPrice:2.613, unit:{tr:'TL/pay',en:'TL/unit'}, desc:{tr:'İş Portföy Sürdürülebilirlik Hisse Senedi (TL) Fonu — BIST Sürdürülebilirlik Endeksi',en:'İş Portföy Sustainability Equity (TL) Fund — BIST Sustainability Index'}, color:'#6d28d9', esg:{e:5,s:4,g:5},
    link:'https://www.tefas.gov.tr/FonAnaliz.aspx?FonKod=BIO' },
  { id:'dep', name:{tr:'Vadeli Mevduat',en:'Time Deposit'}, ticker:'%35.50/yıl', tag:{tr:'Mevduat',en:'Deposit'}, tc:'bk', w:10, alloc:10000, buyPrice:null, unit:{tr:'TL',en:'TL'}, desc:{tr:'32 gün vadeli mevduat · %15 stopaj düşülmüş net getiri',en:'32-day time deposit · Net yield after 15% withholding tax'}, color:'#059669', esg:{e:3,s:4,g:4},
    link:null },
];

// Helper to get localized property
function L(obj){ return (typeof obj === 'object' && obj !== null) ? (obj[LANG]||obj.tr||'') : obj; }
function SN(ins){ return L(ins.name).split(/[—(]/)[0].trim(); }

// ════════════════════════════════════════════════════════════════
// HISTORICAL PRICES — update weekly with actual closing prices
// ════════════════════════════════════════════════════════════════
const HISTORY = {
  // Fiyatlar: BTC=CoinGecko/Binance, THYAO/ASELS=Yahoo, Gold=Bigpara/Kapalıçarşı, Fund=TEFAS BIO, Bond=tahakkuk, Dep=basit faiz+stopaj
  // Haftasonu: BIST/hisse/fund carry-forward, BTC/gold güncellenir, bond/dep günlük tahakkuk
  dates: ['2026-02-17','2026-02-18','2026-02-19','2026-02-20','2026-02-21','2026-02-24','2026-02-25','2026-02-26','2026-02-27','2026-02-28','2026-03-03','2026-03-04','2026-03-05'],
  btc:   [2990000, 2960000, 2870000, 2830000, 2850000, 2830000, 2810000, 2795000, 2760000, 2745000, 3026000, 3154000, 3200000],
  thyao: [342.50, 347.00, 335.00, 320.50, 313.25, 310.50, 313.00, 277.25, 280.00, 285.50, 298.00, 287.00, 288.25],
  asels: [295.00, 298.00, 305.00, 307.00, 310.25, 313.25, 309.00, 311.50, 315.00, 322.00, 345.00, 332.50, 311.25],
  gold:  [6904, 6980, 7100, 7050, 7180, 7250, 7297, 7284, 7310, 7350, 7270, 7270, 7305],
  bond:  [100.00, 100.08, 100.16, 100.25, 100.33, 100.58, 100.66, 100.74, 100.82, 100.90, 101.15, 101.23, 101.31],
  fund:  [2.613, 2.583, 2.571, 2.506, 2.510, 2.489, 2.500, 2.474, 2.480, 2.500, 2.350, 2.310, 2.296],
  dep:   [10000.00, 10008.27, 10016.54, 10024.81, 10033.08, 10041.35, 10049.62, 10057.89, 10066.16, 10074.44, 10099.24, 10107.51, 10115.78],
  xu100: [10020, 10085, 9930, 9780, 9720, 9690, 9750, 9580, 9760, 9710, 9560, 9620, 9650],
};

// Haftalık yorumlar — Yurt İçi ve Yurt Dışı ayrı
const WEEK_NOTES = {
  1: {
    domestic: {
      tr: 'BIST 100 hafta içi 14.532 zirve sonrası 13.804\'e geriledi. TCMB politika faizi Ocak\'ta %37\'ye indirilmişti (Şubat\'ta PPK toplantısı yok, sonraki karar 12 Mart). Altın yurt içinde TL bazında yükseldi.',
      en: 'BIST 100 peaked at 14,532 mid-week then pulled back to 13,804. CBRT had cut rates to 37% in January (no MPC meeting in Feb, next decision March 12). Gold rose in TL terms.',
    },
    international: {
      tr: 'ABD tarife artışı (%10 ek) ve ABD-İran gerilimi volatilite yarattı. Bitcoin $68k→$64k düşüş, altın güvenli liman olarak yükseldi. Küresel risk iştahı azaldı.',
      en: 'US tariff hike (+10% surcharge) and US-Iran tensions increased volatility. Bitcoin fell $68k→$64k, gold rallied as safe haven. Global risk appetite declined.',
    }
  },
};

// ════════════════════════════════════════════════════════════════
// FURKAN PORTFOLIO — 7 alternative instruments (only for export)
// buyPrice: null → set dynamically from first API price (2026-02-17)
// ════════════════════════════════════════════════════════════════
const FURKAN_CAPITAL = 100000;
const FURKAN_START_DATE = '2026-02-17'; // Course start date
const FURKAN_INSTRS = [
  { id:'f_btc',   name:'Bitcoin (BTC)',           ticker:'BTC/TRY',      tag:'Kripto Para',    w:30, alloc:30000, buyPrice:null, unit:'TL/BTC',   color:'#f7931a', yahooSym:null,        apiSrc:'binance' },
  { id:'f_eregl', name:'Eregli D.C. (EREGL.IS)',  ticker:'EREGL.IS',     tag:'Hisse',          w:12, alloc:12000, buyPrice:null, unit:'TL/hisse', color:'#2563eb', yahooSym:'EREGL.IS',  apiSrc:'yahoo' },
  { id:'f_arclk', name:'Arcelik (ARCLK.IS)',      ticker:'ARCLK.IS',     tag:'Hisse',          w:12, alloc:12000, buyPrice:null, unit:'TL/hisse', color:'#dc2626', yahooSym:'ARCLK.IS',  apiSrc:'yahoo' },
  { id:'f_altin', name:'Altin (gram)',             ticker:'XAU/TRY',      tag:'Kiymetli Maden', w:16, alloc:16000, buyPrice:null, unit:'TL/gram',  color:'#c9a84c', yahooSym:'GC=F',      apiSrc:'yahoo_gold' },
  { id:'f_tzt',   name:'Ziraat Fon (TZT)',        ticker:'TZT (TEFAS)',  tag:'Yatirim Fonu',   w:10, alloc:10000, buyPrice:null, unit:'TL/pay',   color:'#16a34a', yahooSym:null,        apiSrc:'tefas' },
  { id:'f_phe',   name:'Pusula Fon (PHE)',         ticker:'PHE (TEFAS)',  tag:'Yatirim Fonu',   w:10, alloc:10000, buyPrice:null, unit:'TL/pay',   color:'#7c3aed', yahooSym:null,        apiSrc:'tefas' },
  { id:'f_dep',   name:'Mevduat (Odeabank)',       ticker:'%38.00/yil',   tag:'Mevduat',        w:10, alloc:10000, buyPrice:null, unit:'TL',       color:'#059669', yahooSym:null,        apiSrc:'calc' },
];

// Dynamic — populated by fetchFurkanHistoricalPrices() from real APIs
// NO hardcoded data — tum veriler API'lerden cekilir
const FURKAN_HISTORY = { dates: [] };

// ════════════════════════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════════════════════════
