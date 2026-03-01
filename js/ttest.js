function renderTTest(){
  const el=document.getElementById('tTestSection');
  if(!el) return;
  const dates=HISTORY.dates;
  const tr=LANG==='tr';
  if(dates.length<10){
    el.innerHTML=`<div class="ttest-panel"><div class="ttest-header"><h3>${tr?'Istatistiksel Analiz (t-Test)':'Statistical Analysis (t-Test)'}</h3></div><div class="ttest-body" style="padding:20px;text-align:center;font-size:0.5rem;color:var(--muted)">${tr?'t-Test icin en az 2 haftalik veri gerekli. Veri toplandikca sonuclar burada gorunecek.':'At least 2 weeks of data needed. Results will appear as data accumulates.'}</div></div>`;
    return;
  }
  el.innerHTML=`<div class="ttest-panel"><div class="ttest-header"><h3>${tr?'Istatistiksel Analiz — Student t-Test':'Statistical Analysis — Student\'s t-Test'}</h3></div><div class="ttest-tabs"><button class="ttest-tab active" data-tab="overview" onclick="switchTTestTab('overview')">${tr?'Ozet':'Overview'}</button><button class="ttest-tab" data-tab="method" onclick="switchTTestTab('method')">${tr?'Metodoloji':'Methodology'}</button><button class="ttest-tab" data-tab="portfolio" onclick="switchTTestTab('portfolio')">${tr?'Portfoy Testi':'Portfolio Test'}</button><button class="ttest-tab" data-tab="instruments" onclick="switchTTestTab('instruments')">${tr?'Enstruman Testleri':'Instruments'}</button><button class="ttest-tab" data-tab="data" onclick="switchTTestTab('data')">${tr?'Ham Veri':'Raw Data'}</button></div><div class="ttest-body" id="tTestBody"></div></div>`;
  renderTTestBody();
}

function renderTTestBody(){
  const body=document.getElementById('tTestBody');
  if(!body) return;
  const tr=LANG==='tr', dates=HISTORY.dates;
  function weeklyRet(vals){const wr=[];for(let i=5;i<vals.length;i+=5){const e=Math.min(i,vals.length-1),s=i-5;if(vals[s]>0)wr.push({ret:(vals[e]-vals[s])/vals[s]*100,sd:dates[s],ed:dates[e],sv:vals[s],ev:vals[e]});}return wr;}
  function calcStats(d){const n=d.length,m=d.reduce((a,b)=>a+b,0)/n,v=d.reduce((s,x)=>s+Math.pow(x-m,2),0)/(n-1),sd=Math.sqrt(v),se=sd/Math.sqrt(n);return{n,mean:m,var:v,sd,se};}
  function tCrit(df){const t=[0,12.706,4.303,3.182,2.776,2.571,2.447,2.365,2.306,2.262,2.228,2.201,2.179,2.160,2.145,2.131,2.120,2.110,2.101,2.093,2.086];return df<=20?t[df]||2.086:df<=30?2.042:df<=60?2.000:1.960;}
  function tCrit01(df){const t=[0,63.657,9.925,5.841,4.604,4.032,3.707,3.499,3.355,3.250,3.169,3.106,3.055,3.012,2.977,2.947,2.921,2.898,2.878,2.861,2.845];return df<=20?t[df]||2.845:df<=30?2.750:2.576;}
  function doT(data,mu0){const s=calcStats(data),ts=s.se>0?(s.mean-mu0)/s.se:0,df=s.n-1,tc=tCrit(df),tc1=tCrit01(df),rej=Math.abs(ts)>=tc;return{...s,t:ts,df,tc,rej,p:Math.abs(ts)>=tc1?'p < 0.01':Math.abs(ts)>=tc?'p < 0.05':'p > 0.05',mu0};}

  const pV=dates.map((_,di)=>{let t=0;INSTRS.forEach(ins=>{const p=HISTORY[ins.id]?.[di];if(p===undefined){t+=ins.alloc;return;}t+=ins.id==='dep'?p:(ins.alloc/ins.buyPrice)*p;});return t;});
  const rf=35.5/52, pWR=weeklyRet(pV), pD=pWR.map(w=>w.ret), nW=pD.length;
  if(nW<2){body.innerHTML=`<div style="padding:20px;text-align:center;font-size:0.5rem;color:var(--muted)">${tr?'Minimum 2 hafta gerekli.':'Min 2 weeks needed.'}</div>`;return;}

  const t1=doT(pD,0), t2=doT(pD,rf);
  const iT=[];
  INSTRS.filter(i=>i.id!=='dep').forEach(ins=>{
    const v=dates.map((_,di)=>{const p=HISTORY[ins.id]?.[di];return p!==undefined?(ins.id==='dep'?p:(ins.alloc/ins.buyPrice)*p):ins.alloc;});
    const wr=weeklyRet(v);if(wr.length>=2){const d=wr.map(w=>w.ret);iT.push({nm:SN(ins),col:ins.color,...doT(d,0)});}
  });

  const mono="font-family:'Geist Mono',monospace";

  if(tTestTab==='overview'){
    let h=`<div class="ttest-card"><div class="ttest-card-title">${tr?'Hipotez Testleri Ozet Tablosu':'Hypothesis Tests Summary'}</div>
    <table class="ttest-table"><thead><tr><th>${tr?'Test':'Test'}</th><th style="text-align:right">x̄ (%)</th><th style="text-align:right">s</th><th style="text-align:right">SE</th><th style="text-align:right">t</th><th style="text-align:right">df</th><th style="text-align:right">t<sub>krit</sub></th><th style="text-align:center">p</th><th style="text-align:center">${tr?'Karar':'Decision'}</th></tr></thead><tbody>`;
    function row(label,sub,test,col){
      return `<tr><td>${col?'<span style="color:'+col+'">●</span> ':''}<strong>${label}</strong><br><span style="font-size:0.44rem;color:var(--muted)">${sub}</span></td><td style="text-align:right;${mono};${test.mean>=0?'color:var(--success)':'color:var(--danger)'}">${test.mean>=0?'+':''}${test.mean.toFixed(4)}</td><td style="text-align:right;${mono}">${test.sd.toFixed(4)}</td><td style="text-align:right;${mono}">${test.se.toFixed(4)}</td><td style="text-align:right;${mono};font-weight:700">${test.t.toFixed(4)}</td><td style="text-align:right">${test.df}</td><td style="text-align:right;${mono}">±${test.tc.toFixed(3)}</td><td style="text-align:center;font-weight:600">${test.p}</td><td style="text-align:center">${test.rej?'<span style="color:var(--success);font-weight:700">H₀ RED</span>':'<span style="color:var(--muted)">Kabul</span>'}</td></tr>`;
    }
    h+=row(tr?'Portfoy ≠ 0':'Portfolio ≠ 0','H₀: μ = 0',t1);
    h+=row(tr?'Portfoy ≠ Rf':'Portfolio ≠ Rf','H₀: μ = '+rf.toFixed(3)+'%',t2);
    iT.forEach(t=>h+=row(t.nm,'H₀: μ = 0',t,t.col));
    h+=`</tbody></table><div class="ttest-explain">α = 0.05 · ${tr?'Cift kuyruklu':'Two-tailed'} · n = ${nW} ${tr?'hafta':'weeks'} · Rf = %35.50/${tr?'yil':'yr'} (%${rf.toFixed(3)}/${tr?'hafta':'wk'})</div></div>`;
    body.innerHTML=h;
  }

  else if(tTestTab==='method'){
    body.innerHTML=`
    <div class="ttest-card"><div class="ttest-card-title">${tr?'Student t-Testi Nedir?':'What is Student\'s t-Test?'}</div>
    <div style="font-size:0.56rem;line-height:1.7;color:var(--text2)">${tr?'Student t-testi, bir orneklem ortalamasinin belirli bir degerden (genellikle 0) istatistiksel olarak anlamli sekilde farkli olup olmadigini test eden parametrik bir hipotez testidir. Kucuk orneklemlerde (n < 30) normal dagilim yerine t-dagilimi kullanilir. Orneklemin normal dagilimdan geldigi varsayilir.':'The Student t-test is a parametric hypothesis test that determines whether a sample mean is statistically significantly different from a hypothesized value (usually 0). For small samples (n < 30), the t-distribution is used instead of the normal distribution. It assumes the sample comes from a normally distributed population.'}</div></div>

    <div class="ttest-card"><div class="ttest-card-title">${tr?'Adim 1: Haftalik Getiri':'Step 1: Weekly Return'}</div>
    <div class="ttest-formula">r<sub>i</sub> = (V<sub>t</sub> − V<sub>t−5</sub>) / V<sub>t−5</sub> × 100</div>
    <div class="ttest-explain">${tr?'V = portfoy veya enstruman degeri, t = gun indeksi. Her 5 islem gunu 1 hafta sayilir.':'V = portfolio or instrument value, t = day index. Every 5 trading days = 1 week.'}</div></div>

    <div class="ttest-card"><div class="ttest-card-title">${tr?'Adim 2: Orneklem Ortalamasi (x̄)':'Step 2: Sample Mean (x̄)'}</div>
    <div class="ttest-formula">x̄ = (1/n) × Σ<sup>n</sup><sub>i=1</sub> r<sub>i</sub> = (1/${nW}) × (${pD.reduce((a,b)=>a+b,0).toFixed(4)}) = <strong>${t1.mean.toFixed(4)}%</strong></div></div>

    <div class="ttest-card"><div class="ttest-card-title">${tr?'Adim 3: Orneklem Standart Sapmasi (s)':'Step 3: Sample Standard Deviation (s)'}</div>
    <div class="ttest-formula">s = √[ Σ(r<sub>i</sub> − x̄)² / (n − 1) ] = √(${t1.var.toFixed(6)} / ${t1.df}) = <strong>${t1.sd.toFixed(4)}</strong></div>
    <div class="ttest-explain">${tr?'(n-1) Bessel duzeltmesi: orneklem standart sapmasini hesaplarken serbestlik derecesi n-1 kullanilir, cunku orneklem ortalamasi tahmin edilmistir.':'(n-1) Bessel\'s correction: when estimating population std dev from a sample, we use n-1 degrees of freedom because we estimated the sample mean.'}</div></div>

    <div class="ttest-card"><div class="ttest-card-title">${tr?'Adim 4: Standart Hata (SE)':'Step 4: Standard Error (SE)'}</div>
    <div class="ttest-formula">SE = s / √n = ${t1.sd.toFixed(4)} / √${nW} = <strong>${t1.se.toFixed(4)}</strong></div>
    <div class="ttest-explain">${tr?'Standart hata, orneklem ortalamasinin ne kadar degiskenlik gosterdigini olcer. n arttikca SE azalir, yani tahminimiz daha kesinlesir.':'Standard error measures the variability of the sample mean. As n increases, SE decreases, meaning our estimate becomes more precise.'}</div></div>

    <div class="ttest-card"><div class="ttest-card-title">${tr?'Adim 5: t-Istatistigi':'Step 5: t-Statistic'}</div>
    <div class="ttest-formula">t = (x̄ − μ₀) / SE = (${t1.mean.toFixed(4)} − 0) / ${t1.se.toFixed(4)} = <strong>${t1.t.toFixed(4)}</strong></div>
    <div class="ttest-explain">${tr?'t-istatistigi, orneklem ortalamasinin hipotez edilen degerden kac standart hata uzakta oldugunu gosterir.':'The t-statistic shows how many standard errors the sample mean is from the hypothesized value.'}</div></div>

    <div class="ttest-card"><div class="ttest-card-title">${tr?'Adim 6: Karar Kurali':'Step 6: Decision Rule'}</div>
    <div style="font-size:0.56rem;line-height:1.8;color:var(--text2)">
      df = n − 1 = ${nW} − 1 = <strong>${t1.df}</strong><br>
      t<sub>${tr?'krit':'crit'}</sub> (α=0.05, ${tr?'cift kuyruklu':'two-tailed'}) = <strong>±${t1.tc.toFixed(3)}</strong><br><br>
      <strong>${tr?'Kural':'Rule'}:</strong> |t| ≥ t<sub>${tr?'krit':'crit'}</sub> → H₀ ${tr?'reddedilir':'rejected'}<br>
      |${Math.abs(t1.t).toFixed(4)}| ${t1.rej?'≥':'<'} ${t1.tc.toFixed(3)} → <strong>H₀ ${t1.rej?(tr?'REDDEDİLDİ':'REJECTED'):(tr?'reddedilemedi':'not rejected')}</strong>
    </div>
    <div class="ttest-result ${t1.rej?'reject':'accept'}">${t1.rej?(tr?'Portfoy haftalik getirisi %5 anlamlilik duzeyinde sifirdan istatistiksel olarak farklidir.':'Portfolio weekly return is statistically different from zero at 5% significance.'):(tr?'Portfoy haftalik getirisi sifirdan anlamli sekilde farkli degildir. Not: Orneklem buyuklugu (n='+nW+') kucuktur; 3 ay sonunda ~12 hafta veriyle testin gucu artacaktir.':'Portfolio return is not significantly different from zero. Note: Sample size (n='+nW+') is small; after 3 months (~12 weeks) test power will increase.')}</div></div>`;
  }

  else if(tTestTab==='portfolio'){
    let h='';
    [[(tr?'Test 1: Portfoy Getirisi ≠ 0 mi?':'Test 1: Portfolio Return ≠ 0?'),t1,0],[(tr?'Test 2: Portfoy > Risksiz Getiri mi?':'Test 2: Portfolio > Risk-Free Rate?'),t2,rf]].forEach(([title,t,mu])=>{
      h+=`<div class="ttest-card"><div class="ttest-card-title">${title}</div>
      <div style="font-size:0.52rem;color:var(--muted);margin-bottom:10px">H₀: μ = ${mu.toFixed(3)}%&nbsp; | &nbsp;H₁: μ ≠ ${mu.toFixed(3)}%&nbsp; | &nbsp;α = 0.05&nbsp; | &nbsp;${tr?'Cift kuyruklu':'Two-tailed'}</div>
      <div class="ttest-grid">
        <div class="ttest-stat"><div class="label">x̄</div><div class="value" style="${t.mean>=0?'color:var(--success)':'color:var(--danger)'}">${t.mean>=0?'+':''}${t.mean.toFixed(4)}%</div></div>
        <div class="ttest-stat"><div class="label">s</div><div class="value">${t.sd.toFixed(4)}</div></div>
        <div class="ttest-stat"><div class="label">SE</div><div class="value">${t.se.toFixed(4)}</div></div>
        <div class="ttest-stat"><div class="label">t</div><div class="value" style="color:var(--accent)">${t.t.toFixed(4)}</div></div>
        <div class="ttest-stat"><div class="label">df</div><div class="value">${t.df}</div></div>
        <div class="ttest-stat"><div class="label">t<sub>krit</sub></div><div class="value">±${t.tc.toFixed(3)}</div></div>
      </div>
      <div class="ttest-formula">t = (x̄ − μ₀) / SE = (${t.mean.toFixed(4)} − ${mu.toFixed(3)}) / ${t.se.toFixed(4)} = ${t.t.toFixed(4)}</div>
      <div class="ttest-result ${t.rej?'reject':'accept'}"><strong>|t| = ${Math.abs(t.t).toFixed(4)} ${t.rej?'≥':'<'} ${t.tc.toFixed(3)}</strong> → ${t.rej?'H₀ RED ('+t.p+')':'H₀ Kabul ('+t.p+')'}</div></div>`;
    });
    body.innerHTML=h;
  }

  else if(tTestTab==='instruments'){
    let h=`<div class="ttest-card"><div class="ttest-card-title">${tr?'Enstruman Bazli t-Test (H₀: μ = 0)':'Per-Instrument t-Test (H₀: μ = 0)'}</div>
    <table class="ttest-table"><thead><tr><th>${tr?'Enstruman':'Instrument'}</th><th style="text-align:right">n</th><th style="text-align:right">x̄ (%)</th><th style="text-align:right">s</th><th style="text-align:right">SE</th><th style="text-align:right">t</th><th style="text-align:right">df</th><th style="text-align:right">t<sub>krit</sub></th><th style="text-align:center">p</th><th style="text-align:center">${tr?'Karar':'Decision'}</th></tr></thead><tbody>`;
    iT.forEach(t=>{h+=`<tr><td><span style="color:${t.col}">●</span> <strong>${t.nm}</strong></td><td style="text-align:right">${t.n}</td><td style="text-align:right;${mono};${t.mean>=0?'color:var(--success)':'color:var(--danger)'}">${t.mean>=0?'+':''}${t.mean.toFixed(4)}</td><td style="text-align:right;${mono}">${t.sd.toFixed(4)}</td><td style="text-align:right;${mono}">${t.se.toFixed(4)}</td><td style="text-align:right;${mono};font-weight:700">${t.t.toFixed(4)}</td><td style="text-align:right">${t.df}</td><td style="text-align:right;${mono}">±${t.tc.toFixed(3)}</td><td style="text-align:center;font-weight:600">${t.p}</td><td style="text-align:center">${t.rej?'<span style="color:var(--success);font-weight:700">RED</span>':'<span style="color:var(--muted)">Kabul</span>'}</td></tr>`;});
    h+=`</tbody></table></div>`;
    body.innerHTML=h;
  }

  else if(tTestTab==='data'){
    let h=`<div class="ttest-card"><div class="ttest-card-title">${tr?'Haftalik Portfoy Getirileri':'Weekly Portfolio Returns'}</div>
    <table class="ttest-table"><thead><tr><th>#</th><th>${tr?'Donem':'Period'}</th><th style="text-align:right">${tr?'Baslangic':'Start'} (TL)</th><th style="text-align:right">${tr?'Bitis':'End'} (TL)</th><th style="text-align:right">r<sub>i</sub> (%)</th></tr></thead><tbody>`;
    pWR.forEach((w,i)=>{h+=`<tr><td>${i+1}</td><td>${w.sd?.slice(5)} → ${w.ed?.slice(5)}</td><td style="text-align:right;${mono}">${fmt(w.sv,0)}</td><td style="text-align:right;${mono}">${fmt(w.ev,0)}</td><td style="text-align:right;${mono};font-weight:600;${w.ret>=0?'color:var(--success)':'color:var(--danger)'}">${w.ret>=0?'+':''}${w.ret.toFixed(4)}%</td></tr>`;});
    h+=`</tbody></table>
    <div class="ttest-grid" style="margin-top:12px"><div class="ttest-stat"><div class="label">n</div><div class="value">${nW}</div></div><div class="ttest-stat"><div class="label">Σr<sub>i</sub></div><div class="value">${pD.reduce((a,b)=>a+b,0).toFixed(4)}</div></div><div class="ttest-stat"><div class="label">x̄</div><div class="value">${t1.mean.toFixed(4)}%</div></div><div class="ttest-stat"><div class="label">s²</div><div class="value">${t1.var.toFixed(6)}</div></div><div class="ttest-stat"><div class="label">s</div><div class="value">${t1.sd.toFixed(4)}</div></div><div class="ttest-stat"><div class="label">SE</div><div class="value">${t1.se.toFixed(4)}</div></div></div></div>`;
    body.innerHTML=h;
  }
}

// ════════════════════════════════════════════════════════════════
// CORRELATION PAIR TOOLTIP with mini chart
// ════════════════════════════════════════════════════════════════
function showCorrPair(evt, id1, id2, i, j){
  const tip = document.getElementById('corrTooltip');
  if(!tip) return;
  if(i===j){
    tip.innerHTML=`<div style="text-align:center;padding:16px 0"><div style="font-size:1.2rem;margin-bottom:6px;color:var(--accent)">1.00</div><div style="font-size:0.56rem;color:var(--muted)">${LANG==='tr'?'Kendisiyle mukemmel korelasyon':'Perfect self-correlation'}</div></div>`;
    return;
  }
  const ins1=INSTRS.find(x=>x.id===id1), ins2=INSTRS.find(x=>x.id===id2);
  if(!ins1||!ins2) return;
  const n1=L(ins1.name).split('(')[0].trim(), n2=L(ins2.name).split('(')[0].trim();
  const dates=HISTORY.dates;
  const d1=dates.map((_,di)=>HISTORY[id1]?.[di]||0);
  const d2=dates.map((_,di)=>HISTORY[id2]?.[di]||0);
  const base1=d1[0]||1, base2=d2[0]||1;
  const norm1=d1.map(v=>(v/base1-1)*100);
  const norm2=d2.map(v=>(v/base2-1)*100);
  const all=[...norm1,...norm2];
  const mn=Math.min(...all),mx=Math.max(...all),rng=mx-mn||1;
  const sw=250,sh=90;
  function pts(arr){return arr.map((v,k)=>{const x=(k/(arr.length-1))*sw;const y=sh-((v-mn)/rng)*sh;return `${x.toFixed(1)},${y.toFixed(1)}`;}).join(' ');}
  const zeroY=sh-((0-mn)/rng)*sh;
  const svg=`<svg width="100%" height="${sh}" viewBox="0 0 ${sw} ${sh}" preserveAspectRatio="none" style="display:block;border-radius:4px;background:var(--surface)"><line x1="0" y1="${zeroY}" x2="${sw}" y2="${zeroY}" stroke="var(--border)" stroke-width="0.5" stroke-dasharray="3,3"/><polyline points="${pts(norm1)}" fill="none" stroke="${ins1.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${pts(norm2)}" fill="none" stroke="${ins2.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const rets1=[],rets2=[];
  for(let k=1;k<dates.length;k++){
    const p1=HISTORY[id1]?.[k-1],c1=HISTORY[id1]?.[k],p2=HISTORY[id2]?.[k-1],c2=HISTORY[id2]?.[k];
    rets1.push(p1&&c1?(c1-p1)/p1:0);rets2.push(p2&&c2?(c2-p2)/p2:0);
  }
  const na=rets1.length,ma1=rets1.reduce((s,v)=>s+v,0)/na,ma2=rets2.reduce((s,v)=>s+v,0)/na;
  let num=0,da=0,db=0;
  for(let k=0;k<na;k++){const x=rets1[k]-ma1,y=rets2[k]-ma2;num+=x*y;da+=x*x;db+=y*y;}
  const c=(da>0&&db>0)?num/Math.sqrt(da*db):0;
  const meaning=c>=0.7?(LANG==='tr'?'Birlikte hareket ediyor':'Move together'):c>=0.3?(LANG==='tr'?'Kismen birlikte':'Partially correlated'):c>=-0.3?(LANG==='tr'?'Bagimsiz hareket':'Independent'):c>=-0.7?(LANG==='tr'?'Ters egilim':'Opposite trend'):(LANG==='tr'?'Ters hareket':'Opposite');

  tip.innerHTML=`<div class="ct-title"><span style="color:${ins1.color}">● ${n1}</span> × <span style="color:${ins2.color}">● ${n2}</span></div><div class="ct-val" style="color:${c>=0?'var(--success)':'var(--danger)'}">r = ${c.toFixed(3)}</div><div class="ct-desc">${meaning}</div>${svg}<div style="display:flex;justify-content:space-between;font-size:0.46rem;color:var(--muted);margin-top:3px"><span>${dates[0]?.slice(5)}</span><span>${LANG==='tr'?'Normalize %':'Normalized %'}</span><span>${dates[dates.length-1]?.slice(5)}</span></div>`;
}
function hideCorrPair(){
  const tip=document.getElementById('corrTooltip');
  if(tip) tip.innerHTML=`<div style="font-size:0.5rem;color:var(--muted);text-align:center;padding:20px 0">${LANG==='tr'?'Hucrenin ustune gelin':'Hover over a cell'}</div>`;
}

// ════════════════════════════════════════════════════════════════
// THEME COLOR PICKER
// ════════════════════════════════════════════════════════════════// ════════════════════════════════════════════════════════════════
// MARKET BELL ANIMATION
// ════════════════════════════════════════════════════════════════
let lastBellState = null;
function checkMarketBell(){
  const now=new Date(),d=now.getDay(),h=now.getHours(),m=now.getMinutes();
  const nowMin=h*60+m;
  const bistOpen=d>=1&&d<=5&&nowMin>=600&&nowMin<1080;
  const state=bistOpen?'open':'closed';
  if(lastBellState!==null&&lastBellState!==state){
    const el=document.getElementById('bellOverlay');
    const txt=document.getElementById('bellText');
    if(el&&txt){
      txt.textContent=state==='open'?(LANG==='tr'?'BIST ACILDI':'BIST OPENED'):(LANG==='tr'?'BIST KAPANDI':'BIST CLOSED');
      el.classList.add('show');
      setTimeout(()=>el.classList.remove('show'),2000);
    }
  }
  lastBellState=state;
}

// ════════════════════════════════════════════════════════════════
// DAILY KONFETTI — %1+ daily gain
// ════════════════════════════════════════════════════════════════
let dailyKonfettiShown = false;
function checkDailyKonfetti(){
  if(dailyKonfettiShown) return;
  const dates=HISTORY.dates;
  if(dates.length<2) return;
  const di=dates.length-1;
  let prev=0,curr=0;
  INSTRS.forEach(ins=>{
    const p0=HISTORY[ins.id]?.[di-1],p1=HISTORY[ins.id]?.[di];
    if(p0===undefined||p1===undefined)return;
    prev+=ins.id==='dep'?p0:(ins.alloc/ins.buyPrice)*p0;
    curr+=ins.id==='dep'?p1:(ins.alloc/ins.buyPrice)*p1;
  });
  const dayRet=prev?((curr-prev)/prev)*100:0;
  if(dayRet>=1){
    dailyKonfettiShown=true;
    fireConfetti();
    showToast(LANG==='tr'?'Bugun +%'+dayRet.toFixed(1)+' kazanc!':'Today +'+dayRet.toFixed(1)+'% gain!');
  }
}

// ════════════════════════════════════════════════════════════════
// EASTER EGG — Konami code
// ════════════════════════════════════════════════════════════════
const KONAMI = [38,38,40,40,37,39,37,39,66,65];
let konamiPos = 0;
document.addEventListener('keydown',e=>{
  if(e.keyCode===KONAMI[konamiPos]){
    konamiPos++;
    if(konamiPos===KONAMI.length){
      konamiPos=0;
      // Rainbow mode!
      document.body.style.transition='filter 0.5s';
      document.body.style.filter='hue-rotate(0deg)';
      let deg=0;
      const iv=setInterval(()=>{deg+=5;document.body.style.filter=`hue-rotate(${deg}deg)`;if(deg>=360){clearInterval(iv);document.body.style.filter='';}},30);
      fireConfetti();
      showToast('🎮 KONAMI CODE ACTIVATED!');
    }
  } else konamiPos=0;
});

// ════════════════════════════════════════════════════════════════
// IMPROVED EXCEL EXPORT
// ════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════
// BETA ANALYSIS — CAPM Beta vs BIST-100
// ════════════════════════════════════════════════════════════════
let betaTab='overview';
function switchBetaTab(tab){
  betaTab=tab;
  document.querySelectorAll('.beta-tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===tab));
  renderBetaBody();
}
