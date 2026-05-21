// ════════════════════════════════════════════════════════════════
// MAKRO SAYFA — Türkiye ve global risk göstergeleri
// Tüm metrikler Yahoo Finance'tan otomatik çekilir.
// ════════════════════════════════════════════════════════════════

const MACRO_SYMBOLS = {
  fx: [
    { id:'usdtry',  sym:'USDTRY=X', label:'USD/TRY',          help:'TL\'nin dolar karşısındaki değeri. Yukarı = TL değer kaybı.', cat:'fx' },
    { id:'eurtry',  sym:'EURTRY=X', label:'EUR/TRY',          help:'TL\'nin euro karşısındaki değeri.', cat:'fx' },
    { id:'dxy',     sym:'DX-Y.NYB', label:'DXY (Dolar End.)', help:'Doların 6 büyük para birimi sepetine karşı gücü. Yukarı = küresel dolar gücü, gelişen ülkelere baskı.', cat:'fx' },
    { id:'vix',     sym:'^VIX',     label:'VIX (Korku End.)', help:'Küresel risk iştahı. <15 sakin · 15-25 normal · 25+ stres.', cat:'rate' },
  ],
  bist: [
    { id:'xu100',   sym:'^XU100',   label:'BIST 100',  help:'BIST\'in en büyük 100 hissesini içeren ana endeks.', cat:'bist' },
    { id:'xu030',   sym:'^XU030',   label:'BIST 30',   help:'En büyük 30 hisse — likit ve dış yatırımcı odağı.', cat:'bist' },
    { id:'xbank',   sym:'XBANK.IS', label:'BIST Banka', help:'Banka hisseleri — TL faizine ve kredi büyümesine duyarlı.', cat:'bist' },
    { id:'xusin',   sym:'XUSIN.IS', label:'BIST Sınai', help:'Sınai hisseler — ihracatçılar dövize duyarlı.', cat:'bist' },
  ],
  // ABD getiri eğrisi: kısa → uzun vade. Global risksiz faiz referansı.
  global: [
    { id:'us13w',   sym:'^IRX',     label:'ABD 13W Hazine',  help:'ABD 3-aylık hazine bonosu. Kısa vade küresel risksiz faiz. Yüksek = sıkı para politikası.', cat:'rate' },
    { id:'us5y',    sym:'^FVX',     label:'ABD 5Y Hazine',   help:'ABD 5 yıllık hazine. Orta vade.', cat:'rate' },
    { id:'us10y',   sym:'^TNX',     label:'ABD 10Y Hazine',  help:'ABD 10 yıllık hazine getirisi. Küresel risksiz benchmark. Yukarı = gelişen ülkelerden çıkış baskısı.', cat:'rate' },
    { id:'us30y',   sym:'^TYX',     label:'ABD 30Y Hazine',  help:'ABD 30 yıllık hazine. Uzun vade enflasyon/büyüme beklentisi.', cat:'rate' },
  ],
};

let macroLive = {}; // { id: { price, prev, chg } }

function macroBadge(category, chgAbs){
  const t = MACRO_DATA?.thresholds?.[category];
  if(!t) return { color:'#888', label:'—' };
  if(chgAbs >= t.alarm) return { color:'#c0392b', label:'STRES' };
  if(chgAbs >= t.warn)  return { color:'#c9a84c', label:'DİKKAT' };
  return { color:'#1a472a', label:'NORMAL' };
}

function macroFmt(v, d=2){
  if(v === null || v === undefined || isNaN(v)) return '—';
  return new Intl.NumberFormat(LANG==='en'?'en-US':'tr-TR',{minimumFractionDigits:d,maximumFractionDigits:d}).format(v);
}

async function fetchMacroData(){
  const all = [...MACRO_SYMBOLS.fx, ...MACRO_SYMBOLS.bist, ...MACRO_SYMBOLS.global];
  const settled = await Promise.allSettled(all.map(s => safeGet(yahooProxy(s.sym), 12000, 1)));
  settled.forEach((r, i) => {
    const cfg = all[i];
    if(r.status !== 'fulfilled') {
      console.warn(`[Macro] ${cfg.sym} fetch failed:`, r.reason?.message);
      return;
    }
    const meta = r.value?.chart?.result?.[0]?.meta;
    if(!meta || !meta.regularMarketPrice) return;
    const price = meta.regularMarketPrice;
    const prev  = meta.chartPreviousClose || meta.previousClose || price;
    const chg   = prev > 0 ? ((price/prev) - 1) * 100 : 0;
    macroLive[cfg.id] = { price, prev, chg, src:'Yahoo' };
  });
  return macroLive;
}

function renderMacro(){
  const el = document.getElementById('macroSection');
  if(!el) return;
  const tr = LANG === 'tr';
  el.innerHTML = `<div class="macro-loading" style="text-align:center;padding:40px;color:var(--muted);font-size:0.6rem">${tr?'Makro veriler yükleniyor...':'Loading macro data...'}</div>`;
  fetchMacroData().then(() => renderMacroBody());
}

function renderMacroBody(){
  const el = document.getElementById('macroSection');
  if(!el) return;
  const tr = LANG === 'tr';
  const notes = MACRO_DATA?.notes || [];
  const mono = 'font-family:\'Geist Mono\',monospace';

  function liveCard(cfg){
    const d = macroLive[cfg.id];
    if(!d) return `<div class="macro-card"><div class="mc-head"><div class="mc-label">${cfg.label}</div></div><div class="mc-val">—</div><div class="mc-help">${cfg.help}</div></div>`;
    const b = macroBadge(cfg.cat, Math.abs(d.chg));
    const arrow = d.chg >= 0 ? '▲' : '▼';
    const color = d.chg >= 0 ? 'var(--success)' : 'var(--danger)';
    const isBistIdx = ['xu100','xu030','xbank','xusin'].includes(cfg.id);
    const decimals = isBistIdx ? 0 : 2;
    return `
    <div class="macro-card" data-status="${b.label}">
      <div class="mc-head">
        <div class="mc-label">${cfg.label}</div>
        <span class="mc-badge" style="background:${b.color}">${b.label}</span>
      </div>
      <div class="mc-val" style="${mono}">${macroFmt(d.price, decimals)}</div>
      <div class="mc-chg" style="color:${color};${mono}">${arrow} ${d.chg>=0?'+':''}${d.chg.toFixed(2)}%</div>
      <div class="mc-help">${cfg.help}</div>
    </div>`;
  }

  // Header — en yeni yorum (varsa)
  const latest = notes[0];
  const headerYorum = latest ? `
    <div class="macro-header-comment">
      <div class="mhc-tag">📝 ${tr?'Son Yorum':'Latest Note'} · ${latest.date}</div>
      <div class="mhc-headline">${latest.headline}</div>
      <div class="mhc-body">${latest.body}</div>
    </div>` : '';

  const sectionFx = `
    <section class="macro-section">
      <h3 class="macro-h3">🔴 ${tr?'Kur & Risk':'FX & Risk'}</h3>
      <div class="macro-grid">${MACRO_SYMBOLS.fx.map(liveCard).join('')}</div>
    </section>`;

  const sectionBist = `
    <section class="macro-section">
      <h3 class="macro-h3">🟢 ${tr?'Borsa':'Equities'}</h3>
      <div class="macro-grid">${MACRO_SYMBOLS.bist.map(liveCard).join('')}</div>
    </section>`;

  const sectionGlobal = `
    <section class="macro-section">
      <h3 class="macro-h3">🟡 ${tr?'ABD Hazine Getiri Eğrisi':'US Treasury Yield Curve'}</h3>
      <div class="macro-grid">${MACRO_SYMBOLS.global.map(liveCard).join('')}</div>
      <div style="font-size:0.5rem;color:var(--muted);margin-top:6px;line-height:1.6">
        ${tr?'Kısa → uzun vade getiriler. Normal eğri: uzun vade > kısa vade. Ters (kısa > uzun) ise resesyon sinyali sayılır.':'Short to long maturities. Inversion (short > long) signals recession risk.'}
      </div>
    </section>`;

  const olderNotes = notes.slice(1);
  const notesArchive = olderNotes.length ? `
    <section class="macro-section">
      <h3 class="macro-h3">📚 ${tr?'Geçmiş Yorumlar':'Past Notes'} <span style="font-size:0.5rem;color:var(--muted);font-weight:400">· ${olderNotes.length} ${tr?'kayıt':'entries'}</span></h3>
      <div class="macro-notes-list">
        ${olderNotes.map(n => `
          <details class="macro-note">
            <summary><span class="mn-date">${n.date}</span> <span class="mn-headline">${n.headline}</span></summary>
            <div class="mn-body">${n.body}</div>
          </details>`).join('')}
      </div>
    </section>` : '';

  const learnCards = `
    <section class="macro-section">
      <h3 class="macro-h3">💡 ${tr?'Kavramlar — Hızlı Bakış':'Concepts'}</h3>
      <div class="macro-learn-grid">
        <div class="macro-learn"><strong>DXY (Dolar Endeksi)</strong><br>Doların 6 büyük para birimi sepetine karşı gücü. Yukarı = küresel dolar güçleniyor; TL özelinde değil, tüm gelişen ülkeler etkilenir.</div>
        <div class="macro-learn"><strong>VIX (Korku Endeksi)</strong><br>S&P 500 opsiyon piyasasından çıkarılan 30 günlük volatilite beklentisi. Yüksekse global yatırımcı korkuyor → para güvenli limana (USD, altın) kaçar.</div>
        <div class="macro-learn"><strong>Verim Eğrisi</strong><br>Hazine tahvillerinin kısa → uzun vade getirileri. Normal: uzun vade > kısa vade. Ters dönerse (2Y > 10Y) resesyon sinyali.</div>
        <div class="macro-learn"><strong>BIST 100 vs Sektörel Endeksler</strong><br>BIST 100 ana endeks. Banka endeksi TL faizine, sınai endeks dövize duyarlı. Birbirinden ayrışmaları stres sinyalidir.</div>
        <div class="macro-learn"><strong>USD/TRY Hareketleri</strong><br>Günlük %1.5+ hareket dikkat, %3+ stres. Eş zamanlı BIST düşüşü + USDTRY yükselişi = risk-off (sermaye çıkışı).</div>
        <div class="macro-learn"><strong>ABD 10Y Hazine</strong><br>Küresel risksiz faiz benchmarkı. Yukarı çıkarsa gelişen ülkelerden ABD'ye sermaye akar; TL ve EM piyasaları baskı altına girer.</div>
      </div>
    </section>`;

  el.innerHTML = `
    <div class="macro-page">
      ${headerYorum}
      ${sectionFx}
      ${sectionBist}
      ${sectionGlobal}
      ${notesArchive}
      ${learnCards}
      <div class="macro-footer">
        <em>${tr?'Veri kaynağı':'Source'}: Yahoo Finance · ${tr?'Tüm metrikler otomatik güncellenir':'All metrics updated automatically'}</em>
      </div>
    </div>
  `;
}
