// ════════════════════════════════════════════════════════════════
// i18n — LANGUAGE SYSTEM
// ════════════════════════════════════════════════════════════════
let LANG = 'tr';

const I18N = {
  tr: {
    updatePrices:'Fiyatları Güncelle',
    totalValue:'Toplam Değer', totalPnl:'Toplam Kâr / Zarar',
    bestPerf:'En İyi Performans', worstPerf:'En Kötü Performans',
    instruments:'Enstrümanlar', perfChart:'Performans Grafiği',
    chartTotal:'Toplam', chartInstr:'Enstrüman', chartNorm:'Normalize (%)',
    weeklySummary:'Haftalık Özetler', dailyHistory:'Günlük Fiyat Geçmişi',
    allocation:'Portföy Dağılımı', priceSources:'Fiyat Kaynakları',
    priceExplain:'Fiyat Açıklamaları', esgTitle:'ESG Özeti',
    autoUpdate:'Sayfa açıldığında otomatik güncellenir.',
    nextUpdate:'Sonraki güncelleme',
    startCapital:'Başlangıç: 100.000 TL',
    courseLabel:'Ders:', termLabel:'Dönem:', capitalLabel:'Sermaye:',
    disclaimer:'Bu uygulama eğitim amaçlıdır. Yatırım tavsiyesi değildir.',
    // Table headers
    thInstr:'Enstrüman', thWeight:'Ağırlık', thInvested:'Yatırılan', thQty:'Adet',
    thPrice:'Güncel Fiyat', thValue:'Değer (TL)', thPnl:'Kâr/Zarar', thChg:'% Değ.',
    // Week
    week:'Hafta', domestic:'Yurt İçi', international:'Yurt Dışı',
    noComment:'Haftalık yorum henüz eklenmedi.',
    noData:'Henüz yeterli veri yok.',
    // Fetch
    fetching:'Fiyat çekiliyor...',
    fetchFail:'Fiyat çekilemedi',
    bistClosed:'BIST şu an kapalı. Borsa açıldığında (10:00-18:00) fiyat otomatik güncellenecek.',
    proxyFail:'Yahoo Finance proxy\'sine erişilemiyor. Sonraki güncelleme döngüsünde tekrar denenecek.',
    cryptoFail:'Kripto API\'lerine şu an erişilemiyor. Kısa süre sonra tekrar denenecek.',
    goldFail:'Altın API\'lerine erişilemiyor. Son bilinen fiyat gösteriliyor.',
    lastClose:'Son kapanış fiyatı (public API yok)',
    lastValue:'Son kapanış değeri (public API yok)',
    historyData:'HISTORY verisinden',
    liveUpdated:'canlı fiyat güncellendi',
    bondFundDep:'tahvil, fon, mevduat geçmiş veriden',
    // Info box
    infoApi:'<strong><span style="color:#22c55e">●</span> API (Canlı):</strong> Fiyat internet üzerinden anlık çekildi. Bitcoin 7/24, BIST hisseleri ve altın piyasa saatlerinde güncellenir.',
    infoHistory:'<strong>Geçmiş Veri:</strong> Bu enstrümanların ücretsiz public API\'si yok. Son kapanış fiyatı gösteriliyor:',
    infoBond:'<strong>Tahvil (DİBS):</strong> Haftalık kapanış',
    infoFund:'<strong>BIO Fon:</strong> İş Portföy Sürdürülebilirlik H.S. Fonu — TEFAS kapanış',
    infoDep:'<strong>Mevduat:</strong> Banka hesap değeri',
    infoErr:'<strong><span style="color:#ef4444">●</span> Hata:</strong> API\'ye erişilemedi, en son bilinen fiyat gösteriliyor.',
    // ESG
    esgE:'Çevresel', esgS:'Sosyal', esgG:'Yönetişim', esgAvg:'AĞIRLIKLI ORTALAMA',
    // Donut
    donutTotal:'Toplam',
    riskMetrics:'Risk Metrikleri', corrMatrix:'Korelasyon Matrisi',
    volatility:'Volatilite', maxDrawdown:'Maks. Düşüş', sharpe:'Sharpe Oranı',
    mktCrypto:'Kripto', mktGold:'Altin', athCelebration:'Yeni ATH!',
    riskBasis:'gunluk getiri bazli', corrBasis:'gunluk fiyat degisimleri',
    tTestTitle:'Istatistiksel Analiz (t-Test)', tTestBasis:'haftalik getiriler',
    navDashboard:'Dashboard', navAnalysis:'Analiz', navAnalytics:'Analiz', navMarkets:'Piyasalar', navSample:'Ornek Portfoy', navSettings:'Ayarlar',
    targetComparison:'Hedef Karsilastirma', perfAttribution:'Performans Atribusyonu',
    newsFeed:'Haber Akisi', newsPlaceholder:'Haberler fiyat guncellemesi sirasinda yuklenecektir.',
    settingsTitle:'Ayarlar', settingsTheme:'Tema', settingsLang:'Dil', settingsExport:'Veri Aktar',
    settingsAbout:'Hakkinda', settingsDesc:'Responsible Investment dersi icin gelistirildi.',
    toggleTheme:'Tema Degistir', toggleLang:'Dil Degistir',
    footerDisclaimer:'Bu uygulama egitim amaclidir. Yatirim tavsiyesi degildir.',
    footerData:'Fiyat verileri: CoinGecko, Yahoo Finance, TEFAS',
    footerUpdate:'Son guncelleme:',
  },
  en: {
    updatePrices:'Update Prices',
    totalValue:'Total Value', totalPnl:'Total P/L',
    bestPerf:'Best Performance', worstPerf:'Worst Performance',
    instruments:'Instruments', perfChart:'Performance Chart',
    chartTotal:'Total', chartInstr:'Instrument', chartNorm:'Normalized (%)',
    weeklySummary:'Weekly Summaries', dailyHistory:'Daily Price History',
    allocation:'Portfolio Allocation', priceSources:'Price Sources',
    priceExplain:'Price Explanations', esgTitle:'ESG Summary',
    autoUpdate:'Auto-updates on page load.',
    nextUpdate:'Next update',
    startCapital:'Starting Capital: $100,000',
    courseLabel:'Course:', termLabel:'Term:', capitalLabel:'Capital:',
    disclaimer:'This application is for educational purposes. Not investment advice.',
    thInstr:'Instrument', thWeight:'Weight', thInvested:'Invested', thQty:'Qty',
    thPrice:'Current Price', thValue:'Value (TL)', thPnl:'P/L', thChg:'% Chg.',
    week:'Week', domestic:'Domestic', international:'International',
    noComment:'No weekly comment yet.',
    noData:'Not enough data yet.',
    fetching:'Fetching price...',
    fetchFail:'Price fetch failed',
    bistClosed:'BIST is currently closed. Prices will update during market hours (10:00-18:00).',
    proxyFail:'Yahoo Finance proxy unavailable. Will retry in next update cycle.',
    cryptoFail:'Crypto APIs currently unreachable. Will retry shortly.',
    goldFail:'Gold APIs unreachable. Showing last known price.',
    lastClose:'Last closing price (no public API)',
    lastValue:'Last closing value (no public API)',
    historyData:'from HISTORY data',
    liveUpdated:'live prices updated',
    bondFundDep:'bond, fund, deposit from history',
    infoApi:'<strong><span style="color:#22c55e">●</span> API (Live):</strong> Prices fetched in real time. Bitcoin 24/7, BIST stocks and gold during market hours.',
    infoHistory:'<strong>History Data:</strong> No free public API for these instruments. Last closing price shown:',
    infoBond:'<strong>Bond (DİBS):</strong> Weekly close',
    infoFund:'<strong>BIO Fund:</strong> İş Portföy Sustainability Equity Fund — TEFAS close',
    infoDep:'<strong>Deposit:</strong> Bank account value',
    infoErr:'<strong><span style="color:#ef4444">●</span> Error:</strong> API unreachable, showing last known price.',
    esgE:'Environmental', esgS:'Social', esgG:'Governance', esgAvg:'WEIGHTED AVERAGE',
    donutTotal:'Total',
    riskMetrics:'Risk Metrics', corrMatrix:'Correlation Matrix',
    volatility:'Volatility', maxDrawdown:'Max Drawdown', sharpe:'Sharpe Ratio',
    mktCrypto:'Crypto', mktGold:'Gold', athCelebration:'New ATH!',
    riskBasis:'based on daily returns', corrBasis:'daily price changes',
    tTestTitle:'Statistical Analysis (t-Test)', tTestBasis:'weekly returns',
    navDashboard:'Dashboard', navAnalysis:'Analysis', navAnalytics:'Analytics', navMarkets:'Markets', navSample:'Sample Portfolio', navSettings:'Settings',
    targetComparison:'Target Comparison', perfAttribution:'Performance Attribution',
    newsFeed:'News Feed', newsPlaceholder:'News will load during price update.',
    settingsTitle:'Settings', settingsTheme:'Theme', settingsLang:'Language', settingsExport:'Export Data',
    settingsAbout:'About', settingsDesc:'Built for Responsible Investment course.',
    toggleTheme:'Toggle Theme', toggleLang:'Toggle Language',
    footerDisclaimer:'This app is for educational purposes only. Not investment advice.',
    footerData:'Price data: CoinGecko, Yahoo Finance, TEFAS',
    footerUpdate:'Last update:',
  }
};

function t(key){ return I18N[LANG]?.[key] || I18N.tr[key] || key; }

function setLang(lang){
  LANG = lang;
  document.getElementById('langTR').classList.toggle('active', lang==='tr');
  document.getElementById('langEN').classList.toggle('active', lang==='en');
  document.documentElement.lang = lang;
  // Update brand subtitle
  const bs=document.getElementById('brandSub');
  if(bs) bs.textContent=lang==='tr'?'RESPONSIBLE INVESTMENT · 100.000 TL':'RESPONSIBLE INVESTMENT · $'+fmt(toUsd(CAPITAL),0);
  // Update all data-i18n elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if(I18N[lang]?.[key]) el.textContent = I18N[lang][key];
  });
  // Update sort button
  const sb=document.getElementById('sortBtn');
  if(sb){
    if(tableSortMode==='default') sb.title=lang==='tr'?'Agirliga gore sirala':'Sort by weight';
    else if(tableSortMode==='weight') sb.title=lang==='tr'?'K/Z sirala':'Sort by P/L';
    else sb.title=lang==='tr'?'Varsayilan sira':'Default order';
  }
  // Update info box
  renderInfoBox();
  // Re-render dynamic content
  renderAll();
  // Re-render active sub-page on language change
  if(currentPage==="ttest") renderTTest();
  if(currentPage==="beta") renderBeta();
  if(currentPage==="analytics") renderAnalytics();
  if(currentPage==="markets") renderMarkets();
  if(currentPage==="sample") renderSample();
}

function renderInfoBox(){
  document.getElementById('infoBox').innerHTML = `
    ${t('infoApi')}<br>
    ${t('infoHistory')}<br>
    &nbsp;&nbsp;• ${t('infoBond')}<br>
    &nbsp;&nbsp;• ${t('infoFund')}<br>
    &nbsp;&nbsp;• ${t('infoDep')}<br>
    ${t('infoErr')}
  `;
}

// ════════════════════════════════════════════════════════════════
// DATA
// ════════════════════════════════════════════════════════════════
const CAPITAL = 100000;
const START_DATE = '2026-02-17';
