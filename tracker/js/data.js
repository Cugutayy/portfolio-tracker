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
// MANUAL OVERRIDES — TEFAS API F5 WAF tarafından server-side bloklu,
// hiçbir proxy ulaşamıyor. BIO fonu için güncel fiyat buradan girilir.
// Güncelleme: https://www.tefas.gov.tr/tr/fon-detayli-analiz/BIO
// ════════════════════════════════════════════════════════════════
const MANUAL_FUND_PRICE = { fund: 2.560 }; // BIO — son güncelleme: 2026-05-17

// ════════════════════════════════════════════════════════════════
// HISTORICAL PRICES — update weekly with actual closing prices
// ════════════════════════════════════════════════════════════════
const HISTORY = {
  // Fiyatlar: BTC=CoinGecko/Binance, THYAO/ASELS=Yahoo, Gold=Bigpara/Kapalıçarşı, Fund=TEFAS BIO, Bond=tahakkuk, Dep=basit faiz+stopaj
  // Haftasonu: BIST/hisse/fund carry-forward, BTC/gold güncellenir, bond/dep günlük tahakkuk
  dates: ['2026-02-17','2026-02-18','2026-02-19','2026-02-20','2026-02-21','2026-02-24','2026-02-25','2026-02-26','2026-02-27','2026-02-28','2026-03-03','2026-03-04','2026-03-05','2026-03-06','2026-03-09','2026-03-10','2026-03-11','2026-03-12','2026-03-13','2026-03-16','2026-03-17','2026-03-18','2026-03-19','2026-03-20','2026-03-23','2026-03-24','2026-03-25','2026-03-26','2026-03-27'],
  btc:   [2990000, 2960000, 2870000, 2830000, 2850000, 2830000, 2810000, 2795000, 2760000, 2745000, 3026000, 3154000, 3135000, 3012000, 3026000, 3093000, 3104000, 3119000, 3137000, 3214000, 3306000, 3268000, 3154000, 3107000, 3013000, 3139000, 3128000, 3161000, 3056000],
  thyao: [342.50, 347.00, 335.00, 320.50, 313.25, 310.50, 313.00, 277.25, 280.00, 285.50, 298.00, 287.00, 284.25, 276.75, 282.00, 297.00, 294.75, 292.75, 292.25, 291.00, 290.00, 294.75, 290.75, 289.50, 295.50, 291.00, 293.50, 293.50, 294.00],
  asels: [295.00, 298.00, 305.00, 307.00, 310.25, 313.25, 309.00, 311.50, 315.00, 322.00, 345.00, 332.50, 345.00, 333.50, 319.00, 334.25, 335.75, 330.00, 322.25, 321.50, 320.50, 341.25, 348.75, 338.75, 353.25, 352.00, 337.50, 338.00, 330.75],
  gold:  [6904, 6980, 7100, 7050, 7180, 7250, 7297, 7284, 7310, 7350, 7270, 7270, 7156, 7285, 7216, 7412, 7325, 7253, 7178, 7000, 6850, 6600, 6380, 6150, 5990, 6080, 6180, 6270, 6363],
  bond:  [100.00, 100.08, 100.16, 100.25, 100.33, 100.58, 100.66, 100.74, 100.82, 100.90, 101.15, 101.23, 101.31, 101.40, 101.64, 101.73, 101.81, 101.89, 101.97, 102.22, 102.30, 102.38, 102.47, 102.55, 102.80, 102.88, 102.96, 103.05, 103.13],
  fund:  [2.613, 2.583, 2.571, 2.506, 2.510, 2.489, 2.500, 2.474, 2.480, 2.500, 2.350, 2.310, 2.296, 2.310, 2.320, 2.340, 2.345, 2.340, 2.350, 2.358, 2.365, 2.355, 2.347, 2.340, 2.331, 2.315, 2.318, 2.312, 2.298],
  dep:   [10000.00, 10008.27, 10016.54, 10024.81, 10033.08, 10041.35, 10049.62, 10057.89, 10066.16, 10074.44, 10099.24, 10107.51, 10115.78, 10124.05, 10148.87, 10157.14, 10165.41, 10173.68, 10181.95, 10206.76, 10215.03, 10223.30, 10231.57, 10239.84, 10264.65, 10272.92, 10281.19, 10289.46, 10297.73],
  xu100: [10020, 10085, 9930, 9780, 9720, 9690, 9750, 9580, 9760, 9710, 9560, 9620, 13078, 12792, 12702, 13175, 13200, 13286, 13092, 13100, 13218, 13180, 13100, 13047, 12980, 12766, 12781, 12772, 12698],
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
// apiSrc:'calc' => fetchFurkanHistoricalPrices uses calc.{seed?,rate} for daily accrual
//   seed omitted => use ins.alloc as principal (e.g. mevduat tracks total TL)
//   seed numeric => unit-price series (e.g. tahvil nominal 100)
// decimals controls rendered precision (default 2); used by export label + table cells
const FURKAN_INSTRS = [
  { id:'f_btc',   name:'Bitcoin (BTC)',           ticker:'BTC/TRY',      tag:'Kripto Para',    w:30, alloc:30000, buyPrice:null, unit:'TL/BTC',   color:'#f7931a', yahooSym:null,        apiSrc:'binance',    decimals:0 },
  { id:'f_eregl', name:'Eregli D.C. (EREGL.IS)',  ticker:'EREGL.IS',     tag:'Hisse',          w:12, alloc:12000, buyPrice:null, unit:'TL/hisse', color:'#2563eb', yahooSym:'EREGL.IS',  apiSrc:'yahoo',      decimals:2 },
  { id:'f_krdmd', name:'Kardemir D (KRDMD.IS)',   ticker:'KRDMD.IS',     tag:'Hisse',          w:12, alloc:12000, buyPrice:null, unit:'TL/hisse', color:'#dc2626', yahooSym:'KRDMD.IS',  apiSrc:'yahoo',      decimals:2 },
  { id:'f_altin', name:'Altin (gram)',             ticker:'XAU/TRY',      tag:'Kiymetli Maden', w:16, alloc:16000, buyPrice:null, unit:'TL/gram',  color:'#c9a84c', yahooSym:'GC=F',      apiSrc:'yahoo_gold', decimals:2 },
  { id:'f_bond',  name:'Devlet Tahvili (2Y)',     ticker:'DIBS 2Y',      tag:'Tahvil',         w:10, alloc:10000, buyPrice:100,  unit:'nominal',  color:'#1d4ed8', yahooSym:null,        apiSrc:'calc',       decimals:2, calc:{ seed:100, rate:0.30, label:'Hesaplanan (nominal 100, ~%30 yillik kupon, gunluk tahakkuk)' } },
  { id:'f_phe',   name:'Pusula Fon (PHE)',         ticker:'PHE (TEFAS)',  tag:'Yatirim Fonu',   w:10, alloc:10000, buyPrice:null, unit:'TL/pay',   color:'#7c3aed', yahooSym:null,        apiSrc:'tefas',      decimals:4 },
  { id:'f_dep',   name:'Mevduat (Odeabank)',       ticker:'%38.00/yil',   tag:'Mevduat',        w:10, alloc:10000, buyPrice:null, unit:'TL',       color:'#059669', yahooSym:null,        apiSrc:'calc',       decimals:0, calc:{ rate:0.38 * 0.85, label:'Hesaplanan (%38 yillik, %15 stopaj)' } },
];

// Dynamic — populated by fetchFurkanHistoricalPrices() from real APIs
// TEFAS funds have hardcoded fallback because TEFAS API is behind F5 WAF
const FURKAN_HISTORY = { dates: [] };

// ════════════════════════════════════════════════════════════════
// TEFAS FALLBACK — Real prices from tefas.gov.tr (verified manually)
// TEFAS API is behind F5 WAF that requires browser JS execution,
// so server-side proxies cannot reliably access it.
// ════════════════════════════════════════════════════════════════
// PHE fallback: 17 Sub - 15 May 2026 arasi is gunleri (61 gun).
// 3 gercek TEFAS anchor arasinda piecewise-linear interpolation:
//   2026-03-06: 2.348740 (verified)
//   2026-04-21: 2.828791 (verified)
//   2026-06-04: 3.048807 (verified, anchor extrapolasyon icin)
// Bunlar dogru gunler; aralardaki yaklaşıktır. Gercek gunluk fiyatlar
// icin TEFAS'tan yapistir/guncelle gerekir (WAF nedeniyle otomatik
// scraping calismiyor).
const TEFAS_FALLBACK = {
  PHE: {
    dates:  ['2026-02-17','2026-02-18','2026-02-19','2026-02-20','2026-02-23','2026-02-24','2026-02-25','2026-02-26','2026-02-27','2026-03-02','2026-03-03','2026-03-04','2026-03-05','2026-03-06','2026-03-09','2026-03-10','2026-03-11','2026-03-12','2026-03-13','2026-03-16','2026-03-17','2026-03-18','2026-03-19','2026-03-23','2026-03-24','2026-03-25','2026-03-26','2026-03-27','2026-03-30','2026-03-31','2026-04-01','2026-04-02','2026-04-03','2026-04-06','2026-04-07','2026-04-08','2026-04-09','2026-04-10','2026-04-13','2026-04-14','2026-04-15','2026-04-16','2026-04-17','2026-04-20','2026-04-21','2026-04-22','2026-04-24','2026-04-27','2026-04-28','2026-04-29','2026-04-30','2026-05-04','2026-05-05','2026-05-06','2026-05-07','2026-05-08','2026-05-11','2026-05-12','2026-05-13','2026-05-14','2026-05-15'],
    prices: [2.103045, 2.125900, 2.125090, 2.112341, 2.181667, 2.221405, 2.226113, 2.250810, 2.271802, 2.272566, 2.247888, 2.274028, 2.302507, 2.348740, 2.380048, 2.390484, 2.400919, 2.411355, 2.421791, 2.453099, 2.463535, 2.473971, 2.484407, 2.526150, 2.536586, 2.547022, 2.557458, 2.567894, 2.599201, 2.609637, 2.620073, 2.630509, 2.640945, 2.672253, 2.682689, 2.693124, 2.703560, 2.713996, 2.745304, 2.755740, 2.766176, 2.776612, 2.787047, 2.818355, 2.828791, 2.833791, 2.843792, 2.858793, 2.863794, 2.868794, 2.873794, 2.893796, 2.898796, 2.903796, 2.908797, 2.913797, 2.928798, 2.933799, 2.938799, 2.943799, 2.948800],
  },
};

// ════════════════════════════════════════════════════════════════
// MAKRO VERİ — Yahoo'da olmayan elle güncellenenler + günlük yorumlar
// ════════════════════════════════════════════════════════════════
//
// İŞ AKIŞI:
// 1) Manuel metrikler (politika faizi, tahviller, CDS, rezerv) buraya yazılır.
//    Kaynak: TCMB.gov.tr, Bloomberg HT, Reuters, investing.com
// 2) Günlük yorumlar MACRO_DATA.notes dizisine eklenir.
//    Yeni yorumu en başa (unshift) ekleyerek tarihe göre sıralı tutun.
//
// Tüm metrik değerleri Yahoo Finance'tan otomatik çekilir; manuel alan yok.
const MACRO_DATA = {
  // Renk kodlaması için günlük % değişim eşikleri (mutlak değer)
  thresholds: {
    fx:    { warn: 1.5, alarm: 3.0 },  // kur:    %1.5 dikkat,  %3+ stres
    bist:  { warn: 2.0, alarm: 5.0 },  // borsa:  %2 dikkat,    %5+ panik
    rate:  { warn: 0.5, alarm: 1.5 },  // faiz:   50bp dikkat,  150bp+ büyük
  },

  // Günlük yorumlar — en yeni en üstte
  // Her entry: { date: 'YYYY-MM-DD', headline: 'Kısa başlık', body: 'Detaylı yorum...' }
  notes: [],
};

// ════════════════════════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════════════════════════
