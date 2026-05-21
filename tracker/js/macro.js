// ════════════════════════════════════════════════════════════════
// MAKRO SAYFA — Türkiye makro ve global risk göstergeleri
// Veriler: Yahoo Finance (canlı) + MACRO_DATA (data.js, manuel)
// ════════════════════════════════════════════════════════════════

const MACRO_SYMBOLS = {
  fx: [
    { id:'usdtry',  sym:'USDTRY=X', label:'USD/TRY',          help:'TL\'nin dolar karşısındaki değeri. Yukarı = TL değer kaybı.', cat:'fx' },
    { id:'eurtry',  sym:'EURTRY=X', label:'EUR/TRY',          help:'TL\'nin euro karşısındaki değeri.', cat:'fx' },
    { id:'dxy',     sym:'DX-Y.NYB', label:'DXY (Dolar End.)', help:'Doların 6 büyük para birimi sepetine karşı gücü. Yukarı = küresel dolar gücü, gelişen ülkelere baskı.', cat:'fx' },
  ],
  bist: [
    { id:'xu100',   sym:'^XU100',   label:'BIST 100',  help:'BIST\'in en büyük 100 hissesini içeren ana endeks.', cat:'bist' },
    { id:'xu030',   sym:'^XU030',   label:'BIST 30',   help:'En büyük 30 hisse — likit ve dış yatırımcı odağı.', cat:'bist' },
    { id:'xbank',   sym:'XBANK.IS', label:'BIST Banka', help:'Banka hisseleri — TL faizine ve kredi büyümesine duyarlı.', cat:'bist' },
    { id:'xusin',   sym:'XUSIN.IS', label:'BIST Sınai', help:'Sınai hisseler — ihracatçılar dövize duyarlı.', cat:'bist' },
  ],
  global: [
    { id:'us10y',   sym:'^TNX',     label:'US 10Y',         help:'ABD 10 yıllık tahvil getirisi. Yukarı = küresel risksiz faiz artıyor, gelişen ülkelerden çıkış.', cat:'rate' },
    { id:'vix',     sym:'^VIX',     label:'VIX (Korku End.)', help:'Küresel risk iştahı. <15 sakin · 15-25 normal · 25+ stres.', cat:'rate' },
  ],
};

let macroLive = {}; // { id: { price, prev, chg } }

// ─── Offshore TL Implied Rate — Faiz Paritesi (Covered Interest Parity) ─────
// Formül: r_TRY = ((F/S) × (1 + r_USD × n/360) − 1) × (360/n)
// F: forward USD/TRY, S: spot, r_USD: USD risksiz faiz (yıllık), n: gün sayısı
// Çıkış: yıllık implied TL faizi (%)
function impliedTRYRate(spot, forward, usdRatePct, days){
  if(!spot || !forward || spot <= 0 || forward <= 0 || !days) return null;
  const rUsd = (usdRatePct || 0) / 100;
  const factor = 1 + rUsd * (days / 360);
  return ((forward / spot) * factor - 1) * (360 / days) * 100; // yüzde
}

function renderOffshoreSection(tr, m, mono){
  const spot = macroLive?.usdtry?.price;
  const hasAny = m.fwd1M || m.fwd3M || m.fwd1Y;
  if(!hasAny){
    // Boş durum — kullanıcıyı manuel girişe yönlendir, yer kaplamasın
    return `
    <section class="macro-section">
      <h3 class="macro-h3">🌐 ${tr?'Offshore TL — İleri Vade Beklentileri':'Offshore TL — Forward Curve'}</h3>
      <div class="macro-empty">
        <strong>${tr?'Forward kurları henüz girilmedi.':'No forward rates yet.'}</strong>
        ${tr?'<code>data.js</code> içinde <code>MACRO_DATA.manual.fwd1M / fwd3M / fwd1Y</code> alanlarına Bloomberg HT, Reuters veya offshore broker ekranından bakıp girince burada implied TL faizi otomatik hesaplanır.':'Fill <code>MACRO_DATA.manual.fwd1M / fwd3M / fwd1Y</code> in <code>data.js</code> with forward USDTRY rates; implied TL yields will be computed here.'}
      </div>
    </section>`;
  }

  const tenors = [
    { id:'1M', days:30,  fwd:m.fwd1M, label:tr?'1 Ay':'1 Month' },
    { id:'3M', days:90,  fwd:m.fwd3M, label:tr?'3 Ay':'3 Months' },
    { id:'1Y', days:360, fwd:m.fwd1Y, label:tr?'1 Yıl':'1 Year' },
  ];

  function offshoreCard(t){
    if(!t.fwd) return `<div class="macro-card macro-card-manual"><div class="mc-head"><div class="mc-label">${t.label}</div><span class="mc-badge" style="background:#777">—</span></div><div class="mc-val" style="${mono};color:var(--muted)">veri yok</div></div>`;
    const impl = impliedTRYRate(spot, t.fwd, m.usdRate, t.days);
    const devalAnn = spot > 0 ? ((t.fwd / spot - 1) * (360 / t.days) * 100) : null;
    // Renk eşiği: offshore implied politika faizinden YUKARI saparsa stres (piyasa TCMB'ye güvenmiyor)
    // Aşağı sapma normalde sakinlik anlamına gelir (forward dar, TL stabil bekleniyor)
    const gap = impl - (m.policyRate || 0);
    const badge = gap > 10 ? { color:'#c0392b', label:'STRES' }
                : gap > 3  ? { color:'#c9a84c', label:'AYRIŞMA' }
                : gap > -5 ? { color:'#1a472a', label:'UYUMLU' }
                :            { color:'#1d4ed8', label:'SAKİN' };
    return `
    <div class="macro-card macro-card-manual">
      <div class="mc-head">
        <div class="mc-label">${t.label}</div>
        <span class="mc-badge" style="background:${badge.color}">${badge.label}</span>
      </div>
      <div class="mc-val" style="${mono}">${macroFmt(impl, 2)}<span style="font-size:0.55rem;color:var(--muted);font-weight:400;margin-left:4px">% / ${tr?'yıl':'yr'}</span></div>
      <div class="mc-chg" style="color:var(--muted);${mono};font-size:0.5rem">
        F=${macroFmt(t.fwd,3)} · S=${macroFmt(spot,3)} · ${tr?'yıllık deval':'annual deval'}: ${macroFmt(devalAnn,2)}%
      </div>
      <div class="mc-help">${tr?'Faiz paritesinden hesaplanan offshore TL implied faizi. Politika faizinden 10+ puan yüksekse piyasa TCMB\'ye güvenmiyor demektir.':'Implied TRY yield via covered interest parity. >10pp above policy rate = market does not trust CBRT.'}</div>
    </div>`;
  }

  const summary = (() => {
    const r1y = impliedTRYRate(spot, m.fwd1Y, m.usdRate, 360);
    if(!r1y) return '';
    const gap = r1y - (m.policyRate || 0);
    if(gap > 10) return tr ? `1Y offshore implied faiz politika faizinin <strong>${gap.toFixed(1)} puan üstünde</strong> — piyasa ek sıkılaşma veya hızlı TL değer kaybı fiyatlıyor; TCMB'ye güven düşük.` : `1Y offshore implied is ${gap.toFixed(1)}pp above policy rate.`;
    if(gap > 3)  return tr ? `1Y offshore politika faizinin ${gap.toFixed(1)} puan üstünde — hafif ayrışma, izlenmeli.` : `1Y offshore ${gap.toFixed(1)}pp above policy — mild stress.`;
    if(gap > -5) return tr ? `Offshore faizi politika faizine yakın (${gap.toFixed(1)}pp fark) — piyasa beklentileri TCMB ile uyumlu.` : `Offshore close to policy rate (${gap.toFixed(1)}pp).`;
    return tr ? `1Y offshore politika faizinin <strong>${Math.abs(gap).toFixed(1)} puan altında</strong> — forward dar, piyasa TL'nin stabil seyredeceğini ya da faiz indirimi geleceğini bekliyor.` : `1Y offshore ${Math.abs(gap).toFixed(1)}pp below policy — narrow forward, market expects TL stability or rate cuts.`;
  })();

  return `
    <section class="macro-section">
      <h3 class="macro-h3">🌐 ${tr?'Offshore TL — İleri Vade Beklentileri':'Offshore TL — Forward Curve'}</h3>
      <div class="macro-grid">
        ${tenors.map(offshoreCard).join('')}
      </div>
      ${summary ? `<div class="macro-empty" style="background:linear-gradient(135deg,var(--surface),var(--surface2));border-left:3px solid var(--accent);font-size:0.58rem">${summary}</div>` : ''}
    </section>`;
}

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

  fetchMacroData().then(() => {
    renderMacroBody();
  });
}

function renderMacroBody(){
  const el = document.getElementById('macroSection');
  if(!el) return;
  const tr = LANG === 'tr';
  const m  = MACRO_DATA?.manual || {};
  const notes = MACRO_DATA?.notes || [];

  const mono = 'font-family:\'Geist Mono\',monospace';

  // Live metric card (Yahoo-fed)
  function liveCard(cfg){
    const d = macroLive[cfg.id];
    if(!d) return `<div class="macro-card"><div class="mc-label">${cfg.label}</div><div class="mc-val">—</div><div class="mc-help">${cfg.help}</div></div>`;
    const b = macroBadge(cfg.cat, Math.abs(d.chg));
    const arrow = d.chg >= 0 ? '▲' : '▼';
    const color = d.chg >= 0 ? 'var(--success)' : 'var(--danger)';
    const decimals = cfg.id === 'xu100' || cfg.id === 'xu030' || cfg.id === 'xbank' || cfg.id === 'xusin' ? 0 : 2;
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

  // Manual metric card (no Yahoo data)
  function manualCard(label, val, unit, help, kind){
    return `
    <div class="macro-card macro-card-manual">
      <div class="mc-head">
        <div class="mc-label">${label}</div>
        <span class="mc-badge" style="background:#5a5a5a">MANUEL</span>
      </div>
      <div class="mc-val" style="${mono}">${val !== null && val !== undefined ? macroFmt(val, 2) + (unit||'') : '—'}</div>
      <div class="mc-chg" style="color:var(--muted);font-size:0.5rem">${tr?'Son güncelleme':'Updated'}: ${m.lastUpdate || '—'}</div>
      <div class="mc-help">${help}</div>
    </div>`;
  }

  // Header — global yorum (en yeni)
  const latest = notes[0];
  const headerYorum = latest ? `
    <div class="macro-header-comment">
      <div class="mhc-tag">📝 ${tr?'Son Yorum':'Latest Note'} · ${latest.date}</div>
      <div class="mhc-headline">${latest.headline}</div>
      <div class="mhc-body">${latest.body}</div>
    </div>` : '';

  // 3 sepet
  const sectionFx = `
    <section class="macro-section">
      <h3 class="macro-h3">🔴 ${tr?'Kur & Ülke Riski':'FX & Country Risk'}</h3>
      <div class="macro-grid">
        ${MACRO_SYMBOLS.fx.map(liveCard).join('')}
        ${manualCard(tr?'5Y Türkiye CDS':'Turkey 5Y CDS', m.cds5Y, ' bp', tr?'Ülke risk primi (sigorta). <250bp sakin · 250-400 orta · 400+ stres.':'Country risk premium. <250bp calm · 400+ stress.', 'rate')}
        ${manualCard(tr?'TCMB Net Rezerv':'CBRT Net Reserves', m.netReserves, ' B$', tr?'Swap hariç net rezerv. Negatif = TCMB döviz borçlu (kırılgan).':'Net reserves excluding swaps. Negative = vulnerable.', 'rate')}
      </div>
    </section>`;

  const sectionBist = `
    <section class="macro-section">
      <h3 class="macro-h3">🟢 ${tr?'Borsa':'Equities'}</h3>
      <div class="macro-grid">
        ${MACRO_SYMBOLS.bist.map(liveCard).join('')}
      </div>
    </section>`;

  const sectionRates = `
    <section class="macro-section">
      <h3 class="macro-h3">🟡 ${tr?'Faizler':'Interest Rates'}</h3>
      <div class="macro-grid">
        ${manualCard(tr?'TCMB Politika Faizi':'CBRT Policy Rate',     m.policyRate, '%', tr?'1-haftalık repo. PPK toplantılarında değişir.':'1-week repo. Set by MPC.','rate')}
        ${manualCard(tr?'TLREF (Gecelik)':'TLREF (Overnight)',         m.tlref,      '%', tr?'Piyasanın TL\'ye verdiği gerçek günlük fiyat. Politika faizinden çok yüksekse stres.':'Real overnight TL rate. Above policy rate = stress.','rate')}
        ${manualCard(tr?'2Y DİBS':'2Y Govt Bond',                       m.bond2Y,     '%', tr?'2 yıllık hazine tahvili getirisi. Kısa vade beklentisi.':'2Y bond yield.','rate')}
        ${manualCard(tr?'10Y DİBS':'10Y Govt Bond',                     m.bond10Y,    '%', tr?'10 yıllık hazine tahvili. Uzun vade enflasyon/risk beklentisi.':'10Y bond yield.','rate')}
        ${MACRO_SYMBOLS.global.map(liveCard).join('')}
      </div>
    </section>
    ${renderOffshoreSection(tr, m, mono)}`;

  // Yorum geçmişi (en yeni ilk; ilkini header'da gösterdik, kalanları aşağıda)
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

  // Öğrenme kartları (sabit)
  const learnCards = `
    <section class="macro-section">
      <h3 class="macro-h3">💡 ${tr?'Kavramlar — Hızlı Bakış':'Concepts'}</h3>
      <div class="macro-learn-grid">
        <div class="macro-learn"><strong>CDS (Credit Default Swap)</strong><br>Bir ülke borcunun batma olasılığına karşı ödenen sigorta primi. 400bp = "yıllık %4 sigorta" demek. Yukarı = piyasa daha çok endişeli.</div>
        <div class="macro-learn"><strong>DXY (Dolar Endeksi)</strong><br>Doların 6 büyük para birimi sepetine karşı gücü. Yukarıysa dolar global olarak güçleniyor — TL özelinde değil, tüm gelişen ülkeler etkilenir.</div>
        <div class="macro-learn"><strong>TLREF vs Politika Faizi</strong><br>TLREF gerçek piyasa fiyatı, politika faizi TCMB'nin "olması istediğim". Aralarındaki açık büyürse politika güveni kaybediyor demektir.</div>
        <div class="macro-learn"><strong>Verim Eğrisi (2Y vs 10Y)</strong><br>Normal: uzun vade > kısa vade (yatırımcı zaman primi ister). Ters dönerse (2Y > 10Y) resesyon sinyali sayılır.</div>
        <div class="macro-learn"><strong>Net Rezerv</strong><br>TCMB'nin elindeki net döviz. Negatif = TCMB döviz borçlu (swap'larla şişirilmiş gross rezerv güvenilmez). Krizde "ne kadar müdahale edebilir" sorusunun cevabı.</div>
        <div class="macro-learn"><strong>VIX (Korku Endeksi)</strong><br>S&P 500 opsiyon piyasasından çıkarılan 30 günlük volatilite beklentisi. Yüksekse global yatırımcı korkuyor → para güvenli limana kaçar (USD, altın).</div>
      </div>
    </section>`;

  el.innerHTML = `
    <div class="macro-page">
      ${headerYorum}
      ${sectionFx}
      ${sectionBist}
      ${sectionRates}
      ${notesArchive}
      ${learnCards}
      <div class="macro-footer">
        <em>${tr?'Veri kaynakları':'Sources'}: Yahoo Finance · TCMB · Bloomberg HT · investing.com</em>
      </div>
    </div>
  `;
}
