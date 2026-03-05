function renderAnalytics(){
  const el=document.getElementById('analyticsSection');
  if(!el) return;
  const tr=LANG==='tr', dates=HISTORY.dates, mono="font-family:'Geist Mono',monospace";
  const rfAnnual=35.5, rfDaily=rfAnnual/252;

  // Daily portfolio values & returns
  const pV=dates.map((_,di)=>{let t=0;INSTRS.forEach(ins=>{const p=HISTORY[ins.id]?.[di];if(p===undefined){t+=ins.alloc;return;}t+=ins.id==='dep'?p:(ins.alloc/ins.buyPrice)*p;});return t;});
  const pRet=[];for(let i=1;i<pV.length;i++) pRet.push((pV[i]-pV[i-1])/pV[i-1]*100);
  const n=pRet.length;
  if(n<2){el.innerHTML=`<div style="text-align:center;padding:40px;color:var(--muted);font-size:0.5rem">${tr?'En az 3 gunluk veri gerekli.':'At least 3 days of data needed.'}</div>`;return;}

  function st(d){const n2=d.length,m=d.reduce((a,b)=>a+b,0)/n2,s=Math.sqrt(d.reduce((s2,v)=>s2+Math.pow(v-m,2),0)/(n2-1));return{n:n2,mean:m,sd:s};}
  function instrRet(id){const pr=HISTORY[id];if(!pr||pr.length<2) return [];const r=[];for(let i=1;i<pr.length;i++) r.push((pr[i]-pr[i-1])/pr[i-1]*100);return r;}

  // ═══ SHARPE RATIOS ═══
  const pSt=st(pRet);
  const pSharpe=pSt.sd>0?(pSt.mean-rfDaily)/pSt.sd*Math.sqrt(252):0;
  const sharpes=[{name:tr?'Portfoy':'Portfolio',color:'var(--accent)',val:pSharpe}];
  INSTRS.filter(i=>i.id!=='dep').forEach(ins=>{
    const r=instrRet(ins.id);if(r.length<2) return;
    const s=st(r);
    sharpes.push({name:SN(ins),color:ins.color,val:s.sd>0?(s.mean-rfDaily)/s.sd*Math.sqrt(252):0});
  });
  if(HISTORY.xu100){const xr=instrRet('xu100');if(xr.length>=2){const s=st(xr);sharpes.push({name:'BIST-100',color:'#6366f1',val:s.sd>0?(s.mean-rfDaily)/s.sd*Math.sqrt(252):0});}}
  const maxSh=Math.max(...sharpes.map(s=>Math.abs(s.val)),0.5);

  // ═══ VAR ═══
  const pVaR95=pSt.mean-1.645*pSt.sd;
  const pVaR99=pSt.mean-2.326*pSt.sd;
  const totalVal=pV[pV.length-1];


  // ═══ EFFICIENT FRONTIER ═══
  const activeIns=INSTRS.filter(i=>i.id!=='dep'&&i.id!=='bond');
  const retMatrix=activeIns.map(ins=>instrRet(ins.id));
  const insStats=retMatrix.map(r=>{const s=st(r);return{mean:s.mean*252,sd:s.sd*Math.sqrt(252)};});
  function covMat(rets){
    const k=rets.length,n3=Math.min(...rets.map(r=>r.length));
    const means=rets.map(r=>r.slice(0,n3).reduce((a,b)=>a+b,0)/n3);
    const cm=[];
    for(let i=0;i<k;i++){cm[i]=[];for(let j=0;j<k;j++){let c=0;for(let t2=0;t2<n3;t2++) c+=(rets[i][t2]-means[i])*(rets[j][t2]-means[j]);cm[i][j]=c/(n3-1)*252;}}
    return cm;
  }
  const cov=covMat(retMatrix);
  const efPoints=[];
  for(let s2=0;s2<500;s2++){
    const w=activeIns.map(()=>Math.random());const ws=w.reduce((a,b)=>a+b,0);const wn=w.map(v=>v/ws);
    const ret2=wn.reduce((s3,wi,i)=>s3+wi*insStats[i].mean,0);
    let var2=0;for(let i=0;i<wn.length;i++) for(let j=0;j<wn.length;j++) var2+=wn[i]*wn[j]*cov[i][j];
    const sd2=Math.sqrt(Math.max(var2,0));
    efPoints.push({ret:ret2,sd:sd2,sh:sd2>0?(ret2-rfAnnual)/sd2:0,w:wn});
  }
  const curW=activeIns.map(ins=>ins.w/activeIns.reduce((s3,i2)=>s3+i2.w,0));
  const curRet=curW.reduce((s3,wi,i)=>s3+wi*insStats[i].mean,0);
  let curVar=0;for(let i=0;i<curW.length;i++) for(let j=0;j<curW.length;j++) curVar+=curW[i]*curW[j]*cov[i][j];
  const curSd=Math.sqrt(Math.max(curVar,0));
  const bestSh=efPoints.reduce((b,p)=>p.sh>b.sh?p:b,efPoints[0]);

  // ═══ BUILD HTML ═══
  let h='<div class="ana-grid">';

  // ─── CARD 1: SHARPE ───
  h+=`<div class="ana-card"><div class="ana-title">${tr?'Sharpe Orani':'Sharpe Ratio'} <span class="tag">CAPM</span></div>
  <div style="font-size:0.52rem;color:var(--text2);line-height:1.6;margin-bottom:12px">${tr
    ?'Sharpe orani, birim risk basina elde edilen fazla getiriyi olcer. Yuksek Sharpe = ayni risk icin daha fazla getiri. Negatif = risksiz getirinin altinda performans.'
    :'Sharpe ratio measures excess return per unit of risk. Higher = more return for same risk. Negative = underperforming the risk-free rate.'}</div>
  <div style="font-size:0.50rem;color:var(--muted);margin-bottom:8px;${mono};background:var(--surface2);padding:6px 10px;border-radius:4px">S = (r̄ − Rf) / σ × √252 &nbsp;&nbsp;|&nbsp;&nbsp; Rf = %${rfAnnual}/${tr?'yil':'yr'}</div>
  <div class="sharpe-bar" style="margin-bottom:28px;padding-left:4px;padding-right:4px">`;
  sharpes.forEach(s2=>{
    const pct=Math.abs(s2.val)/maxSh*80;
    h+=`<div class="sharpe-col" style="height:${Math.max(pct,6)}%;background:${s2.val>=0?s2.color:'var(--danger)'};opacity:0.8"><span class="val" style="color:${s2.val>=0?s2.color:'var(--danger)'}">${s2.val.toFixed(2)}</span><span class="lbl">${s2.name}</span></div>`;
  });
  h+=`</div></div>`;

  // ─── CARD 2: VaR ───
  h+=`<div class="ana-card"><div class="ana-title">Value at Risk <span class="tag">VaR</span></div>
  <div style="font-size:0.52rem;color:var(--text2);line-height:1.6;margin-bottom:10px">${tr
    ?'VaR, belirli bir guven duzeyinde bir islem gunu icinde portfoyun kaybedebilecegi maksimum tutari tahmin eder. Parametrik yontem, getirilerin normal dagildigini varsayar.'
    :'VaR estimates the maximum portfolio loss within one trading day at a given confidence level. The parametric method assumes returns are normally distributed.'}</div>
  <div style="font-size:0.50rem;color:var(--muted);${mono};background:var(--surface2);padding:6px 10px;border-radius:4px;margin-bottom:10px">VaR = μ − z × σ &nbsp;&nbsp;|&nbsp;&nbsp; z₉₅ = 1.645 &nbsp;|&nbsp; z₉₉ = 2.326</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
    <div class="var-card"><div class="var-val" style="color:var(--danger)">${pVaR95.toFixed(2)}%</div><div class="var-lbl">${tr?'Gunluk VaR (%95)':'Daily VaR (95%)'}</div></div>
    <div class="var-card"><div class="var-val" style="color:var(--danger)">${pVaR99.toFixed(2)}%</div><div class="var-lbl">${tr?'Gunluk VaR (%99)':'Daily VaR (99%)'}</div></div>
    <div class="var-card"><div class="var-val" style="color:var(--danger)">${fmt(Math.abs(totalVal*pVaR95/100),0)} TL</div><div class="var-lbl">${tr?'Max kayip (%95)':'Max loss (95%)'}</div></div>
    <div class="var-card"><div class="var-val" style="color:var(--danger)">${fmt(Math.abs(totalVal*pVaR99/100),0)} TL</div><div class="var-lbl">${tr?'Max kayip (%99)':'Max loss (99%)'}</div></div>
  </div>
  <div style="font-size:0.4rem;color:var(--muted);margin-top:8px">${tr?'Yorum: %95 guven ile gunluk kayip '+pVaR95.toFixed(2)+'% yi asmayacaktir. '+fmt(Math.abs(totalVal*pVaR95/100),0)+' TL lik portfoy kaybina denk gelir.':'Interpretation: With 95% confidence, daily loss will not exceed '+pVaR95.toFixed(2)+'%. Equivalent to '+fmt(Math.abs(totalVal*pVaR95/100),0)+' TL portfolio loss.'}</div></div>`;

  // ─── CARD 4: EFFICIENT FRONTIER ───
  const efW=480,efH=300,efP=48;
  const allSd=efPoints.map(p=>p.sd).concat(curSd);
  const allRt=efPoints.map(p=>p.ret).concat(curRet);
  const sdMin2=Math.max(Math.min(...allSd)*0.85,0),sdMax2=Math.max(...allSd)*1.15;
  const rtMin2=Math.min(...allRt)-10,rtMax2=Math.max(...allRt)+10;
  const sx=v=>(v-sdMin2)/(sdMax2-sdMin2)*(efW-2*efP)+efP;
  const sy=v=>efH-efP-(v-rtMin2)/(rtMax2-rtMin2)*(efH-2*efP);

  h+=`<div class="ana-card full"><div class="ana-title">${tr?'Etkin Sinir — Monte Carlo Simulasyonu':'Efficient Frontier — Monte Carlo Simulation'} <span class="tag">500 ${tr?'portfoy':'portfolios'}</span></div>
  <div style="font-size:0.52rem;color:var(--text2);line-height:1.6;margin-bottom:10px">${tr
    ?'500 rastgele portfoy agirligi olusturulup her birinin risk-getiri profili hesaplandi. Yesil noktalar yuksek Sharpe oranini, kirmizi noktalar dusuk Sharpe oranini gosterir. Mevcut portfoyunuz ve optimal (max Sharpe) portfoy isaretlenmistir.'
    :'500 random portfolio weights were generated, and each one\'s risk-return profile was calculated. Green dots indicate high Sharpe ratio, red dots low. Your current portfolio and the optimal (max Sharpe) portfolio are marked.'}</div>
  <div class="ef-canvas"><svg viewBox="0 0 ${efW} ${efH}" style="width:100%;display:block">`;
  // Grid lines + labels
  for(let i=0;i<=5;i++){
    const yy=efP+i*(efH-2*efP)/5, rv=rtMax2-(i/5)*(rtMax2-rtMin2);
    h+=`<line x1="${efP}" y1="${yy}" x2="${efW-efP}" y2="${yy}" stroke="var(--border)" stroke-width="0.5" opacity="0.5"/>`;
    h+=`<text x="${efP-6}" y="${yy+3}" text-anchor="end" style="font-size:7px;fill:var(--muted)">${rv.toFixed(0)}%</text>`;
  }
  for(let i=0;i<=4;i++){
    const xx=efP+i*(efW-2*efP)/4, sv=sdMin2+i/4*(sdMax2-sdMin2);
    h+=`<line x1="${xx}" y1="${efP}" x2="${xx}" y2="${efH-efP}" stroke="var(--border)" stroke-width="0.5" opacity="0.3"/>`;
    h+=`<text x="${xx}" y="${efH-efP+14}" text-anchor="middle" style="font-size:7px;fill:var(--muted)">${sv.toFixed(0)}%</text>`;
  }
  // Scatter points
  const shMin=Math.min(...efPoints.map(p=>p.sh)),shMax=Math.max(...efPoints.map(p=>p.sh))||1;
  efPoints.forEach((p,idx)=>{
    const t2=(p.sh-shMin)/(shMax-shMin||1);
    const r2=Math.round(200-t2*160),g2=Math.round(60+t2*90),b2=Math.round(50+t2*50);
    const delay=(idx*4)+'ms';
    h+=`<circle cx="${sx(p.sd)}" cy="${sy(p.ret)}" r="3" fill="rgb(${r2},${g2},${b2})" opacity="0"><animate attributeName="opacity" from="0" to="0.5" dur="0.3s" begin="${delay}" fill="freeze"/><animate attributeName="r" from="0" to="3" dur="0.2s" begin="${delay}" fill="freeze"/></circle>`;
  });
  // Best Sharpe marker
  h+=`<circle cx="${sx(bestSh.sd)}" cy="${sy(bestSh.ret)}" r="7" fill="none" stroke="var(--gold)" stroke-width="2"/>`;
  h+=`<circle cx="${sx(bestSh.sd)}" cy="${sy(bestSh.ret)}" r="3" fill="var(--gold)"/>`;
  h+=`<text x="${sx(bestSh.sd)+10}" y="${sy(bestSh.ret)-6}" style="font-size:8px;fill:var(--gold);font-weight:600">${tr?'Optimal':'Optimal'}</text>`;
  h+=`<text x="${sx(bestSh.sd)+10}" y="${sy(bestSh.ret)+5}" style="font-size:7px;fill:var(--gold)">S = ${bestSh.sh.toFixed(2)}</text>`;
  // Current portfolio marker
  h+=`<circle cx="${sx(curSd)}" cy="${sy(curRet)}" r="7" fill="none" stroke="var(--accent)" stroke-width="2"/>`;
  h+=`<circle cx="${sx(curSd)}" cy="${sy(curRet)}" r="3" fill="var(--accent)"/>`;
  h+=`<text x="${sx(curSd)+10}" y="${sy(curRet)-6}" style="font-size:8px;fill:var(--accent);font-weight:600">${tr?'Mevcut':'Current'}</text>`;
  h+=`<text x="${sx(curSd)+10}" y="${sy(curRet)+5}" style="font-size:7px;fill:var(--accent)">S = ${(curSd>0?(curRet-rfAnnual)/curSd:0).toFixed(2)}</text>`;
  // Axis labels
  h+=`<text x="${efW/2}" y="${efH-4}" text-anchor="middle" style="font-size:9px;fill:var(--muted)">${tr?'Risk — Yillik Standart Sapma (%)':'Risk — Annual Std Deviation (%)'}</text>`;
  h+=`<text x="10" y="${efH/2}" transform="rotate(-90,10,${efH/2})" text-anchor="middle" style="font-size:9px;fill:var(--muted)">${tr?'Beklenen Getiri (% yillik)':'Expected Return (% annual)'}</text>`;
  h+=`</svg></div>
  <div style="display:flex;gap:14px;margin-top:8px;font-size:0.50rem;flex-wrap:wrap;align-items:center">
    <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:50%;border:2px solid var(--accent)"></span> ${tr?'Mevcut portfoy':'Current portfolio'}</span>
    <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:50%;border:2px solid var(--gold)"></span> ${tr?'Optimal (max Sharpe)':'Optimal (max Sharpe)'}</span>
    <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:50%;background:rgb(40,150,100)"></span>→<span style="width:10px;height:10px;border-radius:50%;background:rgb(200,60,50)"></span> ${tr?'Sharpe: yuksek → dusuk':'Sharpe: high → low'}</span>
  </div></div>`;

  // ─── CARD 6: WHAT-IF ───
  h+=`<div class="ana-card full"><div class="ana-title">${tr?'What-If Simulatoru':'What-If Simulator'} <span class="tag">${tr?'Interaktif':'Interactive'}</span></div>
  <div style="font-size:0.52rem;color:var(--text2);line-height:1.6;margin-bottom:10px">${tr
    ?'Enstruman agirliklarini degistirerek portfoyun nasil performans gosterecegini simule edebilirsiniz. Tahvil ve mevduat sabit tutulur, kalan agirliklari slider larla ayarlayin.'
    :'Simulate portfolio performance by adjusting instrument weights. Bond and deposit are kept fixed, adjust remaining weights with sliders.'}</div>
  <div id="whatIfSliders">`;
  activeIns.forEach((ins,i)=>{
    h+=`<div class="slider-row"><label style="color:${ins.color}">${SN(ins)}</label><input type="range" min="0" max="50" value="${ins.w}" step="1" oninput="updateWhatIf()" class="wif-slider" data-idx="${i}"><span class="pct" id="wifPct${i}">${ins.w}%</span></div>`;
  });
  h+=`</div><div id="whatIfResult" style="margin-top:10px"></div></div>`;

  // ─── CARD 5: SUMMARY STATS ───
  h+=`<div class="ana-card"><div class="ana-title">${tr?'Ozet Istatistikler':'Summary Statistics'}</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
    <div class="var-card"><div class="var-val">${pSt.mean>=0?'+':''}${pSt.mean.toFixed(3)}%</div><div class="var-lbl">${tr?'Ort. gunluk getiri (μ)':'Avg daily return (μ)'}</div></div>
    <div class="var-card"><div class="var-val">${pSt.sd.toFixed(3)}%</div><div class="var-lbl">${tr?'Gunluk volatilite (σ)':'Daily volatility (σ)'}</div></div>
    <div class="var-card"><div class="var-val">${(pSt.sd*Math.sqrt(252)).toFixed(1)}%</div><div class="var-lbl">${tr?'Yillik volatilite (σ√252)':'Annual volatility (σ√252)'}</div></div>
    <div class="var-card"><div class="var-val" style="color:${pSharpe>=0?'var(--success)':'var(--danger)'}">${pSharpe.toFixed(3)}</div><div class="var-lbl">${tr?'Sharpe orani':'Sharpe ratio'}</div></div>
    <div class="var-card"><div class="var-val">${n}</div><div class="var-lbl">${tr?'Gozlem sayisi':'Observations'}</div></div>
    <div class="var-card"><div class="var-val" style="color:${(pV[pV.length-1]-CAPITAL)>=0?'var(--success)':'var(--danger)'}">${((pV[pV.length-1]-CAPITAL)/CAPITAL*100).toFixed(2)}%</div><div class="var-lbl">${tr?'Toplam getiri':'Total return'}</div></div>
  </div>
  ${n<30?`<div style="margin-top:10px;padding:10px 12px;background:rgba(201,168,76,0.08);border-left:3px solid var(--gold);border-radius:4px;font-size:0.54rem;line-height:1.6;color:var(--text2)">
    <strong>${tr?'Dusuk Gozlem Uyarisi (n='+n+')':'Low Observation Warning (n='+n+')'}</strong><br>
    ${tr?'Guvenilir istatistiksel analiz icin en az n=30 gozlem (yaklasik 6 hafta) gereklidir. Mevcut n='+n+' ile Sharpe orani, VaR ve diger metrikler yuksek belirsizlik tasir. Veri toplandikca sonuclar normalize olacaktir.'
        :'Reliable statistical analysis requires at least n=30 observations (~6 weeks). With current n='+n+', Sharpe ratio, VaR, and other metrics carry high uncertainty. Results will normalize as data accumulates.'}
    <div style="margin-top:6px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;font-size:0.50rem">
      <div><strong>${tr?'Normal Sharpe:':'Typical Sharpe:'}</strong> 0.5 — 1.5</div>
      <div><strong>${tr?'Normal Vol. (yillik):':'Typical Vol. (annual):'}</strong> 15% — 35%</div>
      <div><strong>${tr?'Normal Beta:':'Typical Beta:'}</strong> 0.5 — 1.5</div>
    </div>
  </div>`:''}</div>`;

  h+=`</div>`; // close ana-grid
  el.innerHTML=h;
  updateWhatIf();
}

// What-If simulator update
function updateWhatIf(){
  const sliders=document.querySelectorAll('.wif-slider');
  if(!sliders.length) return;
  const tr=LANG==='tr';
  const activeIns=INSTRS.filter(i=>i.id!=='dep'&&i.id!=='bond');
  const weights=[];let total=0;
  sliders.forEach((s,i)=>{const v=parseFloat(s.value);weights.push(v);total+=v;document.getElementById('wifPct'+i).textContent=v+'%';});
  const bondW=INSTRS.find(i=>i.id==='bond')?.w||0;
  const depW=INSTRS.find(i=>i.id==='dep')?.w||0;
  const remaining=100-bondW-depW;
  const wn=total>0?weights.map(v=>v/total*remaining/100):weights.map(()=>0);
  const rfDaily=35.5/252;
  function instrRet2(id){const pr=HISTORY[id];if(!pr)return[];const r=[];for(let i=1;i<pr.length;i++) r.push((pr[i]-pr[i-1])/pr[i-1]*100);return r;}
  const retMatrix=activeIns.map(ins=>instrRet2(ins.id));
  const n=Math.min(...retMatrix.map(r=>r.length));
  if(n<2){document.getElementById('whatIfResult').innerHTML='';return;}
  const portRet=[];
  for(let t2=0;t2<n;t2++){
    let r=0;wn.forEach((w,i)=>{if(retMatrix[i][t2]!==undefined) r+=w*retMatrix[i][t2];});
    r+=(bondW/100)*((100*0.30/365)/100*100);
    r+=(depW/100)*((Math.pow(1.355,1/365)-1)*100);
    portRet.push(r);
  }
  const m=portRet.reduce((a,b)=>a+b,0)/n;
  const sd=Math.sqrt(portRet.reduce((s2,v)=>s2+Math.pow(v-m,2),0)/(n-1));
  const sh=sd>0?(m-rfDaily)/sd*Math.sqrt(252):0;
  const annRet=m*252,annVol=sd*Math.sqrt(252);
  const res=document.getElementById('whatIfResult');
  if(res) res.innerHTML=`<div class="ttest-grid" style="grid-template-columns:repeat(3,1fr)">
    <div class="ttest-stat"><div class="label">${tr?'Yillik getiri':'Ann. return'}</div><div class="value" style="color:${annRet>=0?'var(--success)':'var(--danger)'}">${annRet>=0?'+':''}${annRet.toFixed(1)}%</div></div>
    <div class="ttest-stat"><div class="label">${tr?'Yillik vol.':'Ann. vol.'}</div><div class="value">${annVol.toFixed(1)}%</div></div>
    <div class="ttest-stat"><div class="label">Sharpe</div><div class="value" style="color:${sh>=0?'var(--success)':'var(--danger)'}">${sh.toFixed(3)}</div></div>
  </div>`;
}

// ════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════
// MARKETS PAGE — Live prices for indices, stocks, commodities, FX, crypto
// ════════════════════════════════════════════════════════════════
