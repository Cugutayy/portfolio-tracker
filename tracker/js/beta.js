function renderBeta(){
  const el=document.getElementById('betaSection');
  if(!el) return;
  const tr=LANG==='tr', dates=HISTORY.dates;
  if(!HISTORY.xu100||dates.length<3){
    el.innerHTML=`<div class="beta-panel"><div class="beta-header"><h3>${tr?'Beta Analizi (β)':'Beta Analysis (β)'}</h3><p>BIST-100 benchmark</p></div><div style="padding:24px;text-align:center;font-size:0.5rem;color:var(--muted)">${tr?'Beta hesabi icin en az 3 gunluk veri gerekli.':'At least 3 days of data needed for beta calculation.'}</div></div>`;
    return;
  }
  el.innerHTML=`<div class="beta-panel"><div class="beta-header"><h3>${tr?'Beta Analizi — BIST-100 Benchmark':'Beta Analysis — BIST-100 Benchmark'}</h3><p>${tr?'Sistematik risk olcumu · Gunluk getiriler · CAPM modeli':'Systematic risk measurement · Daily returns · CAPM model'}</p></div>
  <div class="ttest-tabs" style="background:var(--surface2)">
    <button class="ttest-tab beta-tab active" data-tab="overview" onclick="switchBetaTab('overview')">${tr?'Ozet':'Overview'}</button>
    <button class="ttest-tab beta-tab" data-tab="method" onclick="switchBetaTab('method')">${tr?'Metodoloji':'Methodology'}</button>
    <button class="ttest-tab beta-tab" data-tab="detail" onclick="switchBetaTab('detail')">${tr?'Detay':'Detail'}</button>
    <button class="ttest-tab beta-tab" data-tab="covmatrix" onclick="switchBetaTab('covmatrix')">${tr?'Kovaryans Matrisi':'Covariance Matrix'}</button>
    <button class="ttest-tab beta-tab" data-tab="data" onclick="switchBetaTab('data')">${tr?'Ham Veri':'Raw Data'}</button>
  </div>
  <div class="ttest-body" id="betaBody"></div></div>`;
  renderBetaBody();
}

function renderBetaBody(){
  const body=document.getElementById('betaBody');
  if(!body) return;
  const tr=LANG==='tr', dates=HISTORY.dates, mono="font-family:'Geist Mono',monospace";
  const xu=HISTORY.xu100;

  // Daily returns for BIST-100
  const mktRet=[];
  for(let i=1;i<xu.length;i++) mktRet.push((xu[i]-xu[i-1])/xu[i-1]*100);

  // Compute beta for an instrument
  function calcBeta(id){
    const prices=HISTORY[id];
    if(!prices||prices.length<3) return null;
    const assetRet=[];
    for(let i=1;i<prices.length;i++) assetRet.push((prices[i]-prices[i-1])/prices[i-1]*100);
    const n=Math.min(assetRet.length,mktRet.length);
    if(n<2) return null;
    const ar=assetRet.slice(0,n),mr=mktRet.slice(0,n);
    // Means
    const mA=ar.reduce((a,b)=>a+b,0)/n;
    const mM=mr.reduce((a,b)=>a+b,0)/n;
    // Covariance and variance
    let cov=0,varM=0;
    for(let i=0;i<n;i++){cov+=(ar[i]-mA)*(mr[i]-mM);varM+=Math.pow(mr[i]-mM,2);}
    cov/=(n-1);varM/=(n-1);
    const beta=varM>0?cov/varM:0;
    const alpha=mA-beta*mM;
    // R-squared
    const varA=ar.reduce((s,v)=>s+Math.pow(v-mA,2),0)/(n-1);
    const r2=varA>0?Math.pow(cov/(Math.sqrt(varA)*Math.sqrt(varM)),2):0;
    // Standard error of beta
    const residuals=ar.map((a,i)=>a-(alpha+beta*mr[i]));
    const sse=residuals.reduce((s,r)=>s+r*r,0);
    const seBeta=n>2?Math.sqrt(sse/((n-2)*varM*(n-1))):0;
    return {beta,alpha,cov,varM,varA:varA,mA,mM,r2,n,seBeta,ar,mr,dates:dates.slice(1,n+1)};
  }

  // Only BIST instruments
  const bistInstrs=INSTRS.filter(i=>['thyao','asels','fund'].includes(i.id));
  const results=[];
  bistInstrs.forEach(ins=>{
    const r=calcBeta(ins.id);
    if(r) results.push({id:ins.id,name:SN(ins),color:ins.color,...r});
  });
  // Also portfolio beta
  const portVals=dates.map((_,di)=>{let t=0;INSTRS.forEach(ins=>{const p=HISTORY[ins.id]?.[di];if(p===undefined){t+=ins.alloc;return;}t+=ins.id==='dep'?p:(ins.alloc/ins.buyPrice)*p;});return t;});
  const pBeta=calcBeta('_port');
  // Manual portfolio beta calc
  const portRet=[];for(let i=1;i<portVals.length;i++) portRet.push((portVals[i]-portVals[i-1])/portVals[i-1]*100);
  const pn=Math.min(portRet.length,mktRet.length);
  if(pn>=2){
    const pr=portRet.slice(0,pn),mr2=mktRet.slice(0,pn);
    const pmA=pr.reduce((a,b)=>a+b,0)/pn,pmM=mr2.reduce((a,b)=>a+b,0)/pn;
    let pcov=0,pvarM=0;for(let i=0;i<pn;i++){pcov+=(pr[i]-pmA)*(mr2[i]-pmM);pvarM+=Math.pow(mr2[i]-pmM,2);}
    pcov/=(pn-1);pvarM/=(pn-1);
    const pb=pvarM>0?pcov/pvarM:0;
    const pa=pmA-pb*pmM;
    const pvarA=pr.reduce((s,v)=>s+Math.pow(v-pmA,2),0)/(pn-1);
    const pr2=pvarA>0?Math.pow(pcov/(Math.sqrt(pvarA)*Math.sqrt(pvarM)),2):0;
    results.unshift({id:'portfolio',name:tr?'Portfoy':'Portfolio',color:'var(--accent)',beta:pb,alpha:pa,cov:pcov,varM:pvarM,varA:pvarA,mA:pmA,mM:pmM,r2:pr2,n:pn,seBeta:0,ar:pr,mr:mr2,dates:dates.slice(1,pn+1)});
  }

  function betaLabel(b){
    if(Math.abs(b)<0.01) return tr?'Sifir (piyasadan bagimsiz)':'Zero (market-independent)';
    if(b<0) return tr?'Negatif (ters hareket)':'Negative (inverse)';
    if(b<0.8) return tr?'Defansif (β < 0.8)':'Defensive (β < 0.8)';
    if(b<=1.2) return tr?'Notr (β ≈ 1.0)':'Neutral (β ≈ 1.0)';
    return tr?'Agresif (β > 1.2)':'Aggressive (β > 1.2)';
  }
  function betaCls(b){return b<0.8?'defensive':b<=1.2?'neutral':'aggressive';}

  // SVG scatter plot
  function scatter(ar,mr,color,beta,alpha){
    const w=280,h2=160,pad=30;
    const allX=mr,allY=ar;
    const xMin=Math.min(...allX)-0.5,xMax=Math.max(...allX)+0.5;
    const yMin=Math.min(...allY)-0.5,yMax=Math.max(...allY)+0.5;
    const sx=v=>(v-xMin)/(xMax-xMin)*(w-2*pad)+pad;
    const sy=v=>h2-pad-(v-yMin)/(yMax-yMin)*(h2-2*pad);
    let svg=`<svg viewBox="0 0 ${w} ${h2}" style="width:100%;max-width:${w}px">`;
    // Axes
    svg+=`<line x1="${pad}" y1="${sy(0)}" x2="${w-pad}" y2="${sy(0)}" stroke="var(--border)" stroke-width="0.5" stroke-dasharray="3"/>`;
    svg+=`<line x1="${sx(0)}" y1="${pad}" x2="${sx(0)}" y2="${h2-pad}" stroke="var(--border)" stroke-width="0.5" stroke-dasharray="3"/>`;
    // Regression line
    const rlx1=xMin,rly1=alpha+beta*rlx1,rlx2=xMax,rly2=alpha+beta*rlx2;
    svg+=`<line x1="${sx(rlx1)}" y1="${sy(rly1)}" x2="${sx(rlx2)}" y2="${sy(rly2)}" stroke="${color}" stroke-width="1.5" opacity="0.6"/>`;
    // Points
    for(let i=0;i<allX.length;i++){
      svg+=`<circle cx="${sx(allX[i])}" cy="${sy(allY[i])}" r="3.5" fill="${color}" opacity="0.8"/>`;
    }
    // Labels
    svg+=`<text x="${w/2}" y="${h2-4}" text-anchor="middle" style="font-size:8px;fill:var(--muted)">BIST-100 ${tr?'getiri':'return'} (%)</text>`;
    svg+=`<text x="4" y="${h2/2}" transform="rotate(-90,4,${h2/2})" style="font-size:8px;fill:var(--muted)">${tr?'Varlik getiri':'Asset return'} (%)</text>`;
    svg+=`</svg>`;
    return svg;
  }

  // ═══ TAB: OVERVIEW ═══
  if(betaTab==='overview'){
    let h=`<div class="beta-card"><div class="beta-card-title">${tr?'Beta Degerleri — BIST-100 Benchmark':'Beta Values — BIST-100 Benchmark'}</div>
    <table class="ttest-table"><thead><tr><th>${tr?'Varlik':'Asset'}</th><th style="text-align:right">β</th><th style="text-align:right">α (%)</th><th style="text-align:right">Cov(r,m)</th><th style="text-align:right">Var(m)</th><th style="text-align:right">R²</th><th style="text-align:right">n</th><th style="text-align:center">${tr?'Yorum':'Interpret'}</th></tr></thead><tbody>`;
    results.forEach(r=>{
      const cls=betaCls(r.beta);
      h+=`<tr><td><span style="color:${r.color}">●</span> <strong>${r.name}</strong></td>
        <td style="text-align:right;${mono};font-weight:700;font-size:0.66rem;${r.beta>1.2?'color:var(--danger)':r.beta<0.8?'color:var(--success)':'color:var(--text)'}">${r.beta.toFixed(4)}</td>
        <td style="text-align:right;${mono}">${r.alpha>=0?'+':''}${r.alpha.toFixed(4)}</td>
        <td style="text-align:right;${mono}">${r.cov.toFixed(4)}</td>
        <td style="text-align:right;${mono}">${r.varM.toFixed(4)}</td>
        <td style="text-align:right;${mono}">${(r.r2*100).toFixed(1)}%</td>
        <td style="text-align:right">${r.n}</td>
        <td style="text-align:center"><span class="beta-interpret ${cls}" style="padding:2px 6px;border-left:0;font-size:0.4rem;display:inline-block">${betaLabel(r.beta)}</span></td></tr>`;
    });
    h+=`</tbody></table></div>`;

    // Visual beta gauges
    results.forEach(r=>{
      const pct=Math.min(Math.max((r.beta+0.5)/3*100,0),100);
      const cls=betaCls(r.beta);
      h+=`<div class="beta-card" style="padding:12px 16px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="font-size:0.5rem;font-weight:600;color:${r.color}">${r.name}</span><span style="${mono};font-weight:700;font-size:0.64rem">β = ${r.beta.toFixed(3)}</span></div>
      <div class="beta-gauge"><div class="beta-gauge-fill" style="width:${pct}%;background:${r.beta<0.8?'var(--success)':r.beta>1.2?'var(--danger)':'var(--gold)'}"></div><div class="beta-gauge-marker" style="left:${Math.min(Math.max((1+0.5)/3*100,0),100)}%" title="β=1"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:0.44rem;color:var(--muted)"><span>β=0</span><span>β=0.5</span><span style="font-weight:600">β=1.0</span><span>β=1.5</span><span>β=2.0+</span></div></div>`;
    });

    h+=`<div style="font-size:0.50rem;color:var(--muted);line-height:1.5;padding:6px 0">${tr?'Benchmark: BIST-100 (XU100) · Gunluk kapanış getiri bazlı · n = '+(mktRet.length)+' gun':'Benchmark: BIST-100 (XU100) · Based on daily closing returns · n = '+(mktRet.length)+' days'}</div>`;
    if(mktRet.length<30) h+=`<div style="margin-top:6px;padding:8px 10px;background:rgba(201,168,76,0.08);border-left:3px solid var(--gold);border-radius:4px;font-size:0.52rem;line-height:1.6;color:var(--text2)">${tr
      ?'<strong>Not:</strong> n='+mktRet.length+' gozlem ile beta degerleri yuksek belirsizlik tasir. Normal beta araligi: 0.5 — 1.5. Guvenilir sonuclar icin en az 30 islem gunu (~6 hafta) veri gereklidir.'
      :'<strong>Note:</strong> With n='+mktRet.length+' observations, beta values carry high uncertainty. Normal beta range: 0.5 — 1.5. At least 30 trading days (~6 weeks) needed for reliable results.'}</div>`;
    body.innerHTML=h;
  }

  // ═══ TAB: METHODOLOGY ═══
  else if(betaTab==='method'){
    const eg=results.find(r=>r.id!=='portfolio')||results[0];
    body.innerHTML=`
    <div class="beta-card"><div class="beta-card-title">${tr?'Beta (β) Nedir?':'What is Beta (β)?'}</div>
    <div style="font-size:0.56rem;line-height:1.8;color:var(--text2)">${tr
      ?'Beta, bir varligin sistematik riskini olcer. Piyasanin (BIST-100) hareketlerine karsi varligin duyarliligini gosterir. CAPM (Capital Asset Pricing Model) cercevesinde kullanilir.'
      :'Beta measures an asset\'s systematic risk — its sensitivity to market (BIST-100) movements. Used within the CAPM (Capital Asset Pricing Model) framework.'}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:10px;font-size:0.52rem">
      <div class="beta-interpret defensive"><strong>β < 1:</strong> ${tr?'Defansif. Piyasa %1 dusunce bu varlik daha az duser.':'Defensive. Falls less than market.'}</div>
      <div class="beta-interpret neutral"><strong>β ≈ 1:</strong> ${tr?'Piyasa ile ayni. Piyasa %1 hareket edince bu da ~%1 hareket eder.':'Moves with market. ~1% per 1% market move.'}</div>
      <div class="beta-interpret aggressive"><strong>β > 1:</strong> ${tr?'Agresif. Piyasa %1 dusunce bu varlik daha fazla duser.':'Aggressive. Falls more than market.'}</div>
    </div></div>

    <div class="beta-card"><div class="beta-card-title">${tr?'Adim 1: Gunluk Getiri Hesaplama':'Step 1: Daily Return Calculation'}</div>
    <div class="ttest-formula">r<sub>i,t</sub> = (P<sub>t</sub> − P<sub>t−1</sub>) / P<sub>t−1</sub> × 100 &nbsp;&nbsp;&nbsp; r<sub>m,t</sub> = (XU100<sub>t</sub> − XU100<sub>t−1</sub>) / XU100<sub>t−1</sub> × 100</div>
    <div class="ttest-explain">${tr?'Her gun icin hem varligin hem de BIST-100 endeksinin yuzde getirileri hesaplanir.':'For each day, percentage returns are calculated for both the asset and BIST-100 index.'}</div></div>

    <div class="beta-card"><div class="beta-card-title">${tr?'Adim 2: Ortalamalar':'Step 2: Means'}</div>
    <div class="ttest-formula">r̄<sub>i</sub> = (1/n) × Σ r<sub>i,t</sub> &nbsp;&nbsp;&nbsp; r̄<sub>m</sub> = (1/n) × Σ r<sub>m,t</sub></div>
    ${eg?`<div class="ttest-explain">${tr?'Ornek':'Example'} (${eg.name}): r̄<sub>i</sub> = ${eg.mA.toFixed(4)}% , r̄<sub>m</sub> = ${eg.mM.toFixed(4)}% , n = ${eg.n}</div>`:''}</div>

    <div class="beta-card"><div class="beta-card-title">${tr?'Adim 3: Kovaryans — Cov(r_i, r_m)':'Step 3: Covariance — Cov(r_i, r_m)'}</div>
    <div style="font-size:0.54rem;line-height:1.7;color:var(--text2);margin-bottom:8px">${tr
      ?'<strong>Kovaryans nedir?</strong> Iki degiskenin birlikte ne kadar ve hangi yonde degistigini gosteren istatistiksel bir olcudur. Beta hesabinda kovaryans, varligin getirisi ile piyasanin getirisi arasindaki iliskiyi yakalar.<br><br><strong>Neden hesapliyoruz?</strong> Cunku beta = "varligin piyasayla birlikte ne kadar hareket ettigi / piyasanin kendi basina ne kadar hareket ettigi" demektir. Pay kismini bulmak icin kovaryansa ihtiyacimiz var.'
      :'<strong>What is covariance?</strong> A statistical measure of how two variables change together, both in magnitude and direction. In beta calculation, covariance captures the relationship between asset returns and market returns.<br><br><strong>Why do we need it?</strong> Beta = "how much the asset moves with the market / how much the market moves on its own". We need covariance for the numerator.'}</div>
    <div class="ttest-formula">Cov(r<sub>i</sub>, r<sub>m</sub>) = Σ(r<sub>i,t</sub> − r̄<sub>i</sub>)(r<sub>m,t</sub> − r̄<sub>m</sub>) / (n − 1)</div>
    <div class="ttest-explain">${tr?'Pozitif kovaryans: varlik ve piyasa genellikle ayni yone hareket eder. Negatif: ters hareket. Sifira yakin: bagimsiz hareket.':'Positive: asset and market generally move together. Negative: opposite directions. Near zero: independent movement.'}</div>
    ${eg?`<div class="ttest-formula">Cov = ${eg.cov.toFixed(6)}</div>`:''}</div>

    <div class="beta-card"><div class="beta-card-title">${tr?'Adim 4: Piyasa Varyansi — Var(r_m)':'Step 4: Market Variance — Var(r_m)'}</div>
    <div style="font-size:0.54rem;line-height:1.7;color:var(--text2);margin-bottom:8px">${tr
      ?'<strong>Varyans nedir?</strong> Bir degiskenin kendi ortalamasindan ne kadar saptigini gosteren olcudur. Piyasa varyansi, BIST-100 getirilerinin ne kadar dalgali (volatil) oldugunu olcer.<br><br><strong>Neden hesapliyoruz?</strong> Beta formulunun paydasidir. Kovaryans tek basina yeterli degildir cunku buyuklugu piyasanin volatilitesine baglidir. Varyansta bolerek bu etkiyi normallestiririz ve "piyasanin 1 birimlik hareketi basina varligin ne kadar hareket ettigi"ni buluruz.'
      :'<strong>What is variance?</strong> A measure of how much a variable deviates from its own mean. Market variance measures how volatile (fluctuating) BIST-100 returns are.<br><br><strong>Why do we need it?</strong> It is the denominator of the beta formula. Covariance alone is not enough because its magnitude depends on market volatility. Dividing by variance normalizes this effect, giving us "asset movement per unit of market movement".'}</div>
    <div class="ttest-formula">Var(r<sub>m</sub>) = Σ(r<sub>m,t</sub> − r̄<sub>m</sub>)² / (n − 1)</div>
    ${eg?`<div class="ttest-formula">Var(r<sub>m</sub>) = ${eg.varM.toFixed(6)}</div>`:''}</div>

    <div class="beta-card"><div class="beta-card-title">${tr?'Adim 5: Beta Hesabi':'Step 5: Beta Calculation'}</div>
    <div style="font-size:0.54rem;line-height:1.7;color:var(--text2);margin-bottom:8px">${tr
      ?'Simdi elimizde iki bilesen var: kovaryans (varligin piyasayla birlikte hareketi) ve piyasa varyansi (piyasanin kendi dalgalanmasi). Birini digerine bolunce beta elde edilir:'
      :'Now we have both components: covariance (asset-market co-movement) and market variance (market\'s own fluctuation). Dividing one by the other gives beta:'}</div>
    <div class="ttest-formula" style="font-size:0.6rem">β = Cov(r<sub>i</sub>, r<sub>m</sub>) / Var(r<sub>m</sub>)</div>
    ${eg?`<div class="ttest-formula">β = ${eg.cov.toFixed(6)} / ${eg.varM.toFixed(6)} = <strong>${eg.beta.toFixed(4)}</strong></div>`:''}</div>

    <div class="beta-card"><div class="beta-card-title">${tr?'Adim 6: Jensen Alpha (α)':'Step 6: Jensen\'s Alpha (α)'}</div>
    <div class="ttest-formula">α = r̄<sub>i</sub> − β × r̄<sub>m</sub></div>
    <div class="ttest-explain">${tr?'Alpha, varligin piyasa hareketinden bagimsiz olarak urettigi fazla getiriyi gosterir. Pozitif alpha = piyasayi yenen performans.':'Alpha shows the excess return generated independently of market movement. Positive alpha = outperformance vs market.'}</div>
    ${eg?`<div class="ttest-formula">α = ${eg.mA.toFixed(4)} − ${eg.beta.toFixed(4)} × (${eg.mM.toFixed(4)}) = <strong>${eg.alpha.toFixed(4)}%</strong></div>`:''}</div>

    <div class="beta-card"><div class="beta-card-title">${tr?'Adim 7: R-kare (R²)':'Step 7: R-squared (R²)'}</div>
    <div class="ttest-formula">R² = [Cov(r<sub>i</sub>,r<sub>m</sub>)]² / [Var(r<sub>i</sub>) × Var(r<sub>m</sub>)]</div>
    <div class="ttest-explain">${tr?'R², varlik getiri degiskenliginin yuzde kacinin piyasa hareketi ile aciklandigini gosterir. R² = %80 ise varligin dalgalanmasinin %80 i piyasadan kaynaklanir.':'R² shows what percentage of asset return variability is explained by market movement. R² = 80% means 80% of volatility comes from the market.'}</div>
    ${eg?`<div class="ttest-formula">R² = ${(eg.r2*100).toFixed(1)}%</div>`:''}</div>`;
  }

  // ═══ TAB: DETAIL ═══
  else if(betaTab==='detail'){
    let h='';
    results.forEach(r=>{
      const cls=betaCls(r.beta);
      h+=`<div class="beta-card"><div class="beta-card-title"><span style="color:${r.color}">●</span> ${r.name}</div>
      <div class="ttest-grid">
        <div class="ttest-stat"><div class="label">β</div><div class="value" style="font-size:0.8rem;${r.beta>1.2?'color:var(--danger)':r.beta<0.8?'color:var(--success)':'color:var(--text)'}">${r.beta.toFixed(4)}</div></div>
        <div class="ttest-stat"><div class="label">α (%)</div><div class="value" style="${r.alpha>=0?'color:var(--success)':'color:var(--danger)'}">${r.alpha>=0?'+':''}${r.alpha.toFixed(4)}</div></div>
        <div class="ttest-stat"><div class="label">R²</div><div class="value">${(r.r2*100).toFixed(1)}%</div></div>
        <div class="ttest-stat"><div class="label">Cov</div><div class="value">${r.cov.toFixed(4)}</div></div>
        <div class="ttest-stat"><div class="label">Var(m)</div><div class="value">${r.varM.toFixed(4)}</div></div>
        <div class="ttest-stat"><div class="label">n</div><div class="value">${r.n}</div></div>
      </div>
      <div class="ttest-formula">β = Cov / Var(m) = ${r.cov.toFixed(6)} / ${r.varM.toFixed(6)} = ${r.beta.toFixed(4)}</div>
      <div class="beta-scatter">${scatter(r.ar,r.mr,r.color,r.beta,r.alpha)}</div>
      <div style="text-align:center;font-size:0.46rem;color:var(--muted)">${tr?'Regresyon dogrusu':'Regression line'}: r<sub>i</sub> = ${r.alpha.toFixed(3)} + ${r.beta.toFixed(3)} × r<sub>m</sub></div>
      <div class="beta-interpret ${cls}">${tr
        ?(r.beta<0.8?'Defansif varlik. BIST-100 %1 duserse bu varlik ortalama %'+Math.abs(r.beta).toFixed(2)+' duser. Daha dusuk sistematik risk.'
          :r.beta>1.2?'Agresif varlik. BIST-100 %1 duserse bu varlik ortalama %'+Math.abs(r.beta).toFixed(2)+' duser. Yuksek sistematik risk.'
          :'Notr varlik. BIST-100 ile benzer oranda hareket eder.')
        :(r.beta<0.8?'Defensive. If BIST-100 drops 1%, this drops ~'+Math.abs(r.beta).toFixed(2)+'%. Lower systematic risk.'
          :r.beta>1.2?'Aggressive. If BIST-100 drops 1%, this drops ~'+Math.abs(r.beta).toFixed(2)+'%. Higher systematic risk.'
          :'Neutral. Moves roughly in line with market.')}</div></div>`;
    });
    body.innerHTML=h;
  }

  // ═══ TAB: COVARIANCE MATRIX ═══
  else if(betaTab==='covmatrix'){
    // Compute daily returns for all instruments
    const allInstrs=[{id:'xu100',name:'BIST-100',color:'var(--muted)'},...INSTRS.filter(i=>HISTORY[i.id]&&HISTORY[i.id].length>=3).map(i=>({id:i.id,name:SN(i),color:i.color}))];
    const returns={};
    allInstrs.forEach(ins=>{
      const prices=ins.id==='xu100'?xu:HISTORY[ins.id];
      if(!prices||prices.length<3) return;
      const ret=[];
      for(let i=1;i<prices.length;i++) ret.push((prices[i]-prices[i-1])/prices[i-1]*100);
      returns[ins.id]=ret;
    });
    const ids=allInstrs.filter(i=>returns[i.id]).map(i=>i);

    // Compute covariance matrix
    function covPair(a,b){
      const ra=returns[a],rb=returns[b];
      const n=Math.min(ra.length,rb.length);
      if(n<2) return 0;
      const mA=ra.slice(0,n).reduce((s,v)=>s+v,0)/n;
      const mB=rb.slice(0,n).reduce((s,v)=>s+v,0)/n;
      let cov=0;
      for(let i=0;i<n;i++) cov+=(ra[i]-mA)*(rb[i]-mB);
      return cov/(n-1);
    }
    function corrPair(a,b){
      const c=covPair(a,b);
      const va=covPair(a,a),vb=covPair(b,b);
      return (va>0&&vb>0)?c/Math.sqrt(va*vb):0;
    }

    // Build covariance matrix table
    let h=`<div class="beta-card"><div class="beta-card-title">${tr?'Kovaryans Matrisi — Cov(r_i, r_j)':'Covariance Matrix — Cov(r_i, r_j)'}</div>
    <div style="font-size:0.52rem;color:var(--text2);margin-bottom:10px;line-height:1.6">${tr
      ?'Kovaryans matrisi, portfoydeki tum varlik ciftlerinin gunluk getirilerinin birlikte ne kadar degistigini gosterir. Diyagonal elemanlar = varyans. Simetrik matris: Cov(i,j) = Cov(j,i).'
      :'The covariance matrix shows how daily returns of all asset pairs move together. Diagonal elements = variance. Symmetric: Cov(i,j) = Cov(j,i).'}</div>
    <div style="overflow-x:auto"><table class="ttest-table" style="font-size:0.42rem"><thead><tr><th></th>`;
    ids.forEach(i=>{h+=`<th style="text-align:right;color:${i.color};min-width:56px;white-space:nowrap">${i.name}</th>`;});
    h+=`</tr></thead><tbody>`;
    ids.forEach((ri,ii)=>{
      h+=`<tr><td style="font-weight:600;color:${ri.color};white-space:nowrap">${ri.name}</td>`;
      ids.forEach((ci,ji)=>{
        const v=covPair(ri.id,ci.id);
        const isDiag=ii===ji;
        const bg=isDiag?'rgba(201,168,76,0.08)':Math.abs(v)>1?'rgba(229,62,62,0.06)':'';
        h+=`<td style="text-align:right;${mono};${bg?'background:'+bg+';':''}font-size:0.42rem">${v.toFixed(4)}</td>`;
      });
      h+=`</tr>`;
    });
    h+=`</tbody></table></div></div>`;

    // Correlation matrix
    h+=`<div class="beta-card"><div class="beta-card-title">${tr?'Korelasyon Matrisi — ρ(r_i, r_j)':'Correlation Matrix — ρ(r_i, r_j)'}</div>
    <div style="font-size:0.52rem;color:var(--text2);margin-bottom:10px;line-height:1.6">${tr
      ?'Korelasyon, kovaryans matrisinin standartlastirilmis halidir. -1 ile +1 arasinda deger alir. Diversifikasyon icin dusuk korelasyonlu varliklar tercih edilir.'
      :'Correlation is the standardized form of the covariance matrix. Values range from -1 to +1. Low correlation assets are preferred for diversification.'}</div>
    <div style="font-size:0.52rem;margin-bottom:8px;line-height:1.6"><div class="ttest-formula">ρ(i,j) = Cov(r<sub>i</sub>, r<sub>j</sub>) / [σ(r<sub>i</sub>) × σ(r<sub>j</sub>)]</div></div>
    <div style="overflow-x:auto"><table class="ttest-table" style="font-size:0.42rem"><thead><tr><th></th>`;
    ids.forEach(i=>{h+=`<th style="text-align:right;color:${i.color};min-width:56px;white-space:nowrap">${i.name}</th>`;});
    h+=`</tr></thead><tbody>`;
    ids.forEach((ri,ii)=>{
      h+=`<tr><td style="font-weight:600;color:${ri.color};white-space:nowrap">${ri.name}</td>`;
      ids.forEach((ci,ji)=>{
        const v=corrPair(ri.id,ci.id);
        const isDiag=ii===ji;
        const color=isDiag?'var(--muted)':v>0.5?'var(--success)':v<-0.3?'var(--danger)':'var(--text)';
        const bg=isDiag?'rgba(201,168,76,0.08)':v>0.7?'rgba(34,197,94,0.08)':v<-0.3?'rgba(229,62,62,0.08)':'';
        h+=`<td style="text-align:right;${mono};color:${color};${bg?'background:'+bg+';':''}font-size:0.42rem">${isDiag?'1.000':v.toFixed(3)}</td>`;
      });
      h+=`</tr>`;
    });
    h+=`</tbody></table></div></div>`;

    // Heatmap legend
    h+=`<div style="font-size:0.48rem;color:var(--muted);line-height:1.5;padding:6px 0">${tr
      ?'<strong>Renk kodlari:</strong> Diyagonal (sari) = varyans · Yuksek korelasyon (yesil) ρ > 0.5 · Negatif korelasyon (kirmizi) ρ < -0.3 · n = '+(mktRet.length)+' gun'
      :'<strong>Color codes:</strong> Diagonal (yellow) = variance · High correlation (green) ρ > 0.5 · Negative correlation (red) ρ < -0.3 · n = '+(mktRet.length)+' days'}</div>`;

    body.innerHTML=h;
  }

  // ═══ TAB: RAW DATA ═══
  else if(betaTab==='data'){
    let h=`<div class="beta-card"><div class="beta-card-title">${tr?'Gunluk Getiriler (%)':'Daily Returns (%)'}</div>
    <table class="ttest-table"><thead><tr><th>${tr?'Tarih':'Date'}</th><th style="text-align:right">XU100</th>`;
    results.forEach(r=>{h+=`<th style="text-align:right;color:${r.color}">${r.name}</th>`;});
    h+=`</tr></thead><tbody>`;
    for(let i=0;i<mktRet.length;i++){
      h+=`<tr><td>${dates[i+1]?.slice(5)}</td><td style="text-align:right;${mono};${mktRet[i]>=0?'color:var(--success)':'color:var(--danger)'}">${mktRet[i]>=0?'+':''}${mktRet[i].toFixed(4)}</td>`;
      results.forEach(r=>{
        const v=r.ar[i];
        if(v!==undefined) h+=`<td style="text-align:right;${mono};${v>=0?'color:var(--success)':'color:var(--danger)'}">${v>=0?'+':''}${v.toFixed(4)}</td>`;
        else h+=`<td style="text-align:right;color:var(--muted)">—</td>`;
      });
      h+=`</tr>`;
    }
    h+=`</tbody></table></div>`;
    body.innerHTML=h;
  }
}

// ════════════════════════════════════════════════════════════════
// ANALYTICS PAGE — Sharpe, VaR, Efficient Frontier, What-If, Heatmap, Rebalancing, Sankey
// ════════════════════════════════════════════════════════════════
