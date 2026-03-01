// ════════════════════════════════════════════════════════════════
// SAMPLE PORTFOLIO — Global Diversified (Research-Based)
// ════════════════════════════════════════════════════════════════
// Based on Morningstar 2026 recommendations + Modern Portfolio Theory
// 100,000 TL budget, 10 instruments across 6 asset classes & 5 geographies

const SAMPLE_PORTFOLIO = [
  {ticker:'VT',    name:'Vanguard Total World Stock ETF',    asset:{tr:'Küresel Hisse',en:'Global Equity'},      weight:20, amount:20000, color:'#1d4ed8',
    desc:{tr:'Tüm dünya borsalarını kapsayan tek ETF. 9.800+ hisse, 47 ülke. Morningstar Gold rating.',en:'Single ETF covering all world markets. 9,800+ stocks, 47 countries. Morningstar Gold rated.'},
    link:'https://www.investing.com/etfs/vanguard-total-world-stock'},
  {ticker:'VOO',   name:'Vanguard S&P 500 ETF',             asset:{tr:'ABD Hisse',en:'US Equity'},               weight:15, amount:15000, color:'#2563eb',
    desc:{tr:'S&P 500 endeksini takip eder. ABD\'nin en büyük 500 şirketi. Expense ratio: %0.03.',en:'Tracks S&P 500 index. Top 500 US companies. Expense ratio: 0.03%.'},
    link:'https://www.investing.com/etfs/vanguard-s-p-500'},
  {ticker:'IEFA',  name:'iShares Core MSCI EAFE ETF',       asset:{tr:'Gelişmiş Piyasalar',en:'Developed Mkts'}, weight:10, amount:10000, color:'#7c3aed',
    desc:{tr:'Avrupa, Japonya, Avustralya hisseleri. ABD dışı gelişmiş piyasalar. Expense ratio: %0.07.',en:'Europe, Japan, Australia equities. Developed markets ex-US. Expense ratio: 0.07%.'},
    link:'https://www.investing.com/etfs/ishares-core-msci-eafe'},
  {ticker:'EEM',   name:'iShares MSCI Emerging Markets ETF', asset:{tr:'Gelişen Piyasalar',en:'Emerging Mkts'},  weight:8,  amount:8000,  color:'#059669',
    desc:{tr:'Çin, Hindistan, Brezilya, Tayvan, G. Kore. Yüksek büyüme potansiyeli.',en:'China, India, Brazil, Taiwan, S. Korea. High growth potential.'},
    link:'https://www.investing.com/etfs/ishares-msci-emerging-markets'},
  {ticker:'GLD',   name:'SPDR Gold Shares',                  asset:{tr:'Altın',en:'Gold'},                       weight:10, amount:10000, color:'#c9a84c',
    desc:{tr:'Fiziksel altın destekli ETF. Enflasyon koruması + güvenli liman.',en:'Physical gold-backed ETF. Inflation hedge + safe haven.'},
    link:'https://www.investing.com/etfs/spdr-gold-trust'},
  {ticker:'IUSB',  name:'iShares Core USD Bond ETF',         asset:{tr:'ABD Tahvil',en:'US Bond'},               weight:12, amount:12000, color:'#3b82f6',
    desc:{tr:'ABD devlet + kurumsal tahviller. Bloomberg US Universal endeksi. Yield: ~%4.2.',en:'US govt + corporate bonds. Bloomberg US Universal index. Yield: ~4.2%.'},
    link:'https://www.investing.com/etfs/ishares-core-total-usd-bond-market'},
  {ticker:'IBIT',  name:'iShares Bitcoin Trust ETF',          asset:{tr:'Kripto',en:'Crypto'},                   weight:5,  amount:5000,  color:'#e67e22',
    desc:{tr:'BlackRock\'un spot Bitcoin ETF\'i. SEC onaylı, güvenli saklama.',en:'BlackRock spot Bitcoin ETF. SEC approved, secure custody.'},
    link:'https://www.investing.com/etfs/ishares-bitcoin-trust'},
  {ticker:'DJIST.IS', name:'DJIST BIST-100 ETF',             asset:{tr:'Türkiye Hisse',en:'Turkey Equity'},      weight:8,  amount:8000,  color:'#c0392b',
    desc:{tr:'BIST 100 endeksini takip eden ETF. Türkiye piyasa riski ile büyüme fırsatı.',en:'Tracks BIST 100 index. Turkey market exposure with growth opportunity.'},
    link:'https://www.investing.com/etfs/dow-jones-istanbul-20'},
  {ticker:'FDVV',  name:'Fidelity High Dividend ETF',        asset:{tr:'Temettü Hisse',en:'Dividend Equity'},    weight:7,  amount:7000,  color:'#6d28d9',
    desc:{tr:'Yüksek temettü + temettü büyümesi filtresi. ~100 hisse, Morningstar Silver.',en:'High dividend + dividend growth filter. ~100 stocks, Morningstar Silver rated.'},
    link:'https://www.investing.com/etfs/fidelity-high-dividend-etf'},
  {ticker:'CASH',  name:{tr:'Nakit / Kısa Vadeli Mevduat',en:'Cash / Short-Term Deposit'}, asset:{tr:'Nakit',en:'Cash'}, weight:5, amount:5000, color:'#64748b',
    desc:{tr:'Acil durum fonu ve fırsat maliyeti. Yüksek faiz ortamında %35+ getiri.',en:'Emergency fund + opportunity cost. 35%+ yield in high-rate environment.'},
    link:null},
];

function renderSample(){
  const el=document.getElementById('sampleSection');
  if(!el) return;
  const tr=LANG==='tr';
  const mono="font-family:'Geist Mono',monospace";
  const total=SAMPLE_PORTFOLIO.reduce((s,i)=>s+i.amount,0);

  let donutSvg='', offset=0;
  const r=70,c=2*Math.PI*r;
  SAMPLE_PORTFOLIO.forEach((item,idx)=>{
    const pct=item.weight/100;
    const dash=pct*c;
    const gap=c-dash;
    donutSvg+=`<circle cx="90" cy="90" r="${r}" fill="none" stroke="${item.color}" stroke-width="24"
      stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-offset}" stroke-linecap="butt"
      style="opacity:0"><animate attributeName="opacity" from="0" to="1" begin="${idx*0.12}s" dur="0.4s" fill="freeze"/>
    </circle>`;
    offset+=dash;
  });

  const classes={};
  SAMPLE_PORTFOLIO.forEach(i=>{
    const cls=L(i.asset);
    classes[cls]=(classes[cls]||0)+i.weight;
  });

  let h=`<div style="margin-bottom:24px">
    <div style="font-size:0.92rem;font-weight:600;color:var(--text);margin-bottom:6px">${tr?'Örnek Portföy — Küresel Çeşitlendirme':'Sample Portfolio — Global Diversification'}</div>
    <div style="font-size:0.58rem;color:var(--muted);line-height:1.5">${tr
      ?'Morningstar 2026 önerilerine dayalı, 10 enstrümanlı küresel çeşitlendirilmiş portföy. 100.000 TL bütçe, 6 varlık sınıfı, 5 coğrafya.'
      :'Research-based globally diversified portfolio with 10 instruments. 100,000 TL budget, 6 asset classes, 5 geographies.'}</div>
  </div>`;

  h+=`<div style="display:grid;grid-template-columns:220px 1fr;gap:24px;margin-bottom:24px;align-items:start">
    <div style="text-align:center">
      <svg viewBox="0 0 180 180" style="width:200px;height:200px;transform:rotate(-90deg)">${donutSvg}</svg>
      <div style="font-family:'Instrument Serif',serif;font-size:1.2rem;color:var(--text);margin-top:-110px;position:relative;z-index:1">${fmt(total,0)} TL</div>
      <div style="font-size:0.52rem;color:var(--muted);margin-top:4px;position:relative;z-index:1">10 ${tr?'enstrüman':'instruments'}</div>
    </div>
    <div>
      <div style="font-size:0.62rem;font-weight:600;color:var(--text);margin-bottom:10px">${tr?'Varlık Sınıfı Dağılımı':'Asset Class Breakdown'}</div>
      ${Object.entries(classes).map(([cls,w])=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <div style="height:4px;border-radius:2px;background:var(--accent);width:${w*2.5}px;min-width:8px"></div>
        <span style="font-size:0.56rem;color:var(--text)">${cls}</span>
        <span style="${mono};font-size:0.54rem;color:var(--muted)">%${w}</span>
      </div>`).join('')}
      <div style="margin-top:14px;font-size:0.54rem;color:var(--muted);line-height:1.5">
        ${tr?'Hisse: %68 · Tahvil: %12 · Altın: %10 · Kripto: %5 · Nakit: %5':'Equity: 68% · Bond: 12% · Gold: 10% · Crypto: 5% · Cash: 5%'}
      </div>
    </div>
  </div>`;

  h+=`<table class="instr-table" style="margin-bottom:20px">
    <thead><tr>
      <th style="text-align:left">${tr?'Enstrüman':'Instrument'}</th>
      <th>${tr?'Varlık Sınıfı':'Asset Class'}</th>
      <th>${tr?'Ağırlık':'Weight'}</th>
      <th>${tr?'Tutar':'Amount'}</th>
      <th style="text-align:left">${tr?'Açıklama':'Description'}</th>
    </tr></thead><tbody>`;

  SAMPLE_PORTFOLIO.forEach((item,idx)=>{
    const name=typeof item.name==='object'?L(item.name):item.name;
    const linkHtml=item.link?`<a href="${item.link}" target="_blank" rel="noopener" class="ext-link" title="Investing.com">↗</a>`:'';
    h+=`<tr style="animation:anaIn ${0.3+idx*0.05}s ease-out both">
      <td style="text-align:left">
        <div class="iname-row">
          <span style="width:8px;height:8px;border-radius:50%;background:${item.color};flex-shrink:0;display:inline-block"></span>
          <span class="iname">${name}</span>
          ${linkHtml}
        </div>
        <span class="isub">${item.ticker}</span>
      </td>
      <td style="font-size:0.60rem">${L(item.asset)}</td>
      <td style="${mono};font-weight:600">%${item.weight}</td>
      <td style="${mono}">${fmt(item.amount,0)} TL</td>
      <td style="text-align:left;font-size:0.56rem;color:var(--text2);max-width:280px;white-space:normal;line-height:1.4">${L(item.desc)}</td>
    </tr>`;
  });
  h+=`</tbody></table>`;

  h+=`<div class="ana-card" style="padding:18px;margin-bottom:16px;animation:anaIn 0.5s ease-out both">
    <div class="ana-title">${tr?'Yatırım Stratejisi':'Investment Strategy'}</div>
    <div style="font-size:0.58rem;line-height:1.7;color:var(--text2)">
    ${tr
      ?`<strong>Çekirdek-Uydu Yaklaşımı:</strong> Portföyün %45'i geniş çeşitlendirilmiş ETF'lerden (VT + VOO) oluşur — bu "çekirdek" kısımdır. Kalan %55 ise belirli bölge, varlık sınıfı ve tematik yatırımlarla "uydu" olarak dağıtılmıştır.<br><br>
      <strong>Coğrafi Dağılım:</strong> ABD (%37), Avrupa/Japonya (%10), Gelişen Piyasalar (%8), Türkiye (%8), Küresel (%20). Bu dağılım ev ülkesi yanlılığını (home bias) azaltır.<br><br>
      <strong>Risk Yönetimi:</strong> Altın (%10) enflasyon koruması sağlar, tahvil (%12) oynaklığı düşürür, nakit (%5) acil fırsatlar için likidite sağlar. Bitcoin ETF (%5) yüksek risk/getiri pozisyonudur.<br><br>
      <strong>Kaynak:</strong> Morningstar Gold/Silver rated ETF'ler, 2026 yılı tavsiyeleri baz alınmıştır.`
      :`<strong>Core-Satellite Approach:</strong> 45% of the portfolio consists of broadly diversified ETFs (VT + VOO) as the "core." The remaining 55% is distributed across specific regions, asset classes, and thematic investments as "satellites."<br><br>
      <strong>Geographic Distribution:</strong> US (37%), Europe/Japan (10%), Emerging Markets (8%), Turkey (8%), Global (20%). This reduces home country bias.<br><br>
      <strong>Risk Management:</strong> Gold (10%) provides inflation protection, bonds (12%) reduce volatility, cash (5%) provides liquidity for opportunities. Bitcoin ETF (5%) is a high risk/return position.<br><br>
      <strong>Source:</strong> Based on Morningstar Gold/Silver rated ETFs, 2026 recommendations.`}
    </div>
  </div>`;

  h+=`<div class="ana-card" style="padding:18px;animation:anaIn 0.55s ease-out both">
    <div class="ana-title">${tr?'Coğrafi Dağılım':'Geographic Distribution'}</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px">
      ${[
        {flag:'🇺🇸',name:tr?'ABD':'US',pct:37,color:'#1d4ed8'},
        {flag:'🌍',name:tr?'Küresel':'Global',pct:20,color:'#059669'},
        {flag:'🇪🇺',name:tr?'Avrupa/Japonya':'Europe/Japan',pct:10,color:'#7c3aed'},
        {flag:'🇹🇷',name:tr?'Türkiye':'Turkey',pct:8,color:'#c0392b'},
        {flag:'🌏',name:tr?'Gelişen Piyasalar':'Emerging Mkts',pct:8,color:'#f59e0b'},
        {flag:'🪙',name:tr?'Altın + Nakit':'Gold + Cash',pct:17,color:'#c9a84c'},
      ].map(g=>`<div style="text-align:center;padding:12px;background:var(--surface2);border-radius:8px">
        <div style="font-size:1.3rem">${g.flag}</div>
        <div style="font-size:0.56rem;font-weight:600;margin-top:4px">${g.name}</div>
        <div style="${mono};font-size:0.68rem;font-weight:700;color:${g.color}">%${g.pct}</div>
      </div>`).join('')}
    </div>
  </div>`;

  el.innerHTML=h;
}
