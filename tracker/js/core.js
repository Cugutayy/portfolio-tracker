function getLatestPrice(id) {
  if (livePrices[id]?.price) return livePrices[id].price;
  const h = HISTORY[id];
  if (h?.length) return h[h.length-1];
  return INSTRS.find(i=>i.id===id)?.buyPrice||0;
}
function currVal(instr) {
  const p = getLatestPrice(instr.id);
  if (instr.id==='dep') return p;
  if (!p||!instr.buyPrice) return instr.alloc;
  return (instr.alloc / instr.buyPrice) * p;
}
function getQty(instr) {
  if (instr.id==='dep') return null; // mevduat has no qty
  if (!instr.buyPrice) return null;
  return instr.alloc / instr.buyPrice;
}
function pnlVal(i){return currVal(i)-i.alloc;}
function pnlPct(i){return i.alloc?(pnlVal(i)/i.alloc*100):0;}
function fmt(v,d=2){
  const locale = LANG==='en' ? 'en-US' : 'tr-TR';
  return new Intl.NumberFormat(locale,{minimumFractionDigits:d,maximumFractionDigits:d}).format(v);
}
function toUsd(tl){ return usdTryRate > 0 ? tl / usdTryRate : tl; }
function fmtCur(v){
  if(LANG==='en') return '$' + fmt(toUsd(v),2);
  return fmt(v) + ' TL';
}
function fmtP(v){return (v>=0?'+':'')+fmt(v)+'%';}
function fmtShort(v){if(Math.abs(v)>=1e6)return fmt(v/1e6,1)+'M';if(Math.abs(v)>=1e3)return fmt(v/1e3,1)+'K';return fmt(v);}
function showToast(msg){const el=document.getElementById('toast');el.textContent=msg;el.style.opacity='1';clearTimeout(el._t);el._t=setTimeout(()=>{el.style.opacity='0';},4000);}

function exportCSV(){
  // Rich HTML-based Excel export
  const tr = LANG==='tr';
  let total=0; INSTRS.forEach(i=>{total+=currVal(i);});
  const tp=total-CAPITAL, tpct=tp/CAPITAL*100;
  const dateStr=new Date().toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric'});
  const timeStr=new Date().toLocaleTimeString('tr-TR');

  const hStyle='background:#1a472a;color:#fff;font-weight:bold;padding:8px 12px;font-size:11px;border:1px solid #fff;';
  const cStyle='padding:6px 10px;border:1px solid #ddd;font-size:10px;';
  const numStyle=cStyle+'text-align:right;font-family:Consolas,monospace;';
  const posStyle=numStyle+'color:#1a472a;font-weight:bold;';
  const negStyle=numStyle+'color:#c0392b;font-weight:bold;';

  let h='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Portfolio</x:Name></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>';

  // Title section
  h+='<table><tr><td colspan="10" style="font-size:18px;font-weight:bold;padding:12px;color:#1a472a;font-family:Georgia,serif">Portfolio Tracker</td></tr>';
  h+='<tr><td colspan="10" style="font-size:10px;color:#888;padding:4px 12px">'+dateStr+' &middot; '+timeStr+'</td></tr>';
  h+='<tr><td colspan="10" style="padding:2px"></td></tr>';

  // Summary box
  h+='<tr><td colspan="3" style="'+cStyle+'background:#f8f7f2;font-weight:bold">'+(tr?'Toplam Deger':'Total Value')+'</td>';
  h+='<td colspan="2" style="'+numStyle+'background:#f8f7f2;font-weight:bold;font-size:13px">'+fmt(total,2)+' TL</td>';
  h+='<td colspan="2" style="'+cStyle+'background:#f8f7f2;font-weight:bold">'+(tr?'Kar/Zarar':'P/L')+'</td>';
  h+='<td colspan="3" style="'+(tp>=0?posStyle:negStyle)+'background:#f8f7f2;font-size:13px">'+(tp>=0?'+':'')+fmt(tp,2)+' TL ('+tpct.toFixed(2)+'%)</td></tr>';
  h+='<tr><td colspan="10" style="padding:4px"></td></tr>';

  // Main table header
  h+='<tr><td style="'+hStyle+'">'+(tr?'Enstruman':'Instrument')+'</td>';
  h+='<td style="'+hStyle+'">Ticker</td>';
  h+='<td style="'+hStyle+'">'+(tr?'Agirlik':'Weight')+'</td>';
  h+='<td style="'+hStyle+'">'+(tr?'Yatirilan':'Invested')+'</td>';
  h+='<td style="'+hStyle+'">'+(tr?'Adet':'Qty')+'</td>';
  h+='<td style="'+hStyle+'">'+(tr?'Alis':'Buy')+'</td>';
  h+='<td style="'+hStyle+'">'+(tr?'Guncel':'Current')+'</td>';
  h+='<td style="'+hStyle+'">'+(tr?'Deger':'Value')+'</td>';
  h+='<td style="'+hStyle+'">K/Z</td>';
  h+='<td style="'+hStyle+'">%</td></tr>';

  // Data rows
  INSTRS.forEach((ins,idx) => {
    const cv=currVal(ins),pl=pnlVal(ins),pp=pnlPct(ins),price=getLatestPrice(ins.id);
    const qty=getQty(ins);
    const bg=idx%2===0?'#fff':'#fafaf8';
    const rs=cStyle+'background:'+bg+';';
    const rn=numStyle+'background:'+bg+';';
    const plS=(pl>=0?posStyle:negStyle)+'background:'+bg+';';
    h+='<tr>';
    h+='<td style="'+rs+'font-weight:600;color:'+ins.color+'">'+L(ins.name)+'</td>';
    h+='<td style="'+rs+'">'+ins.ticker+'</td>';
    h+='<td style="'+rn+'">%'+ins.w+'</td>';
    h+='<td style="'+rn+'">'+fmt(ins.alloc,0)+'</td>';
    h+='<td style="'+rn+'">'+(qty?qty.toFixed(ins.id==='btc'?6:2):'--')+'</td>';
    h+='<td style="'+rn+'">'+fmt(ins.buyPrice,2)+'</td>';
    h+='<td style="'+rn+'">'+fmt(ins.id==='dep'?cv:price,2)+'</td>';
    h+='<td style="'+rn+'font-weight:600">'+fmt(cv,2)+'</td>';
    h+='<td style="'+plS+'">'+(pl>=0?'+':'')+fmt(pl,2)+'</td>';
    h+='<td style="'+plS+'">'+(pp>=0?'+':'')+pp.toFixed(2)+'%</td>';
    h+='</tr>';
  });

  // Total row
  h+='<tr><td colspan="7" style="'+hStyle+'background:#2d5a3a">'+(tr?'TOPLAM':'TOTAL')+'</td>';
  h+='<td style="'+hStyle+'background:#2d5a3a;text-align:right;font-size:12px">'+fmt(total,2)+'</td>';
  h+='<td style="'+hStyle+'background:#2d5a3a;text-align:right">'+(tp>=0?'+':'')+fmt(tp,2)+'</td>';
  h+='<td style="'+hStyle+'background:#2d5a3a;text-align:right">'+tpct.toFixed(2)+'%</td></tr>';

  // Spacer
  h+='<tr><td colspan="10" style="padding:8px"></td></tr>';

  // Weekly summary section
  const dates=HISTORY.dates;
  if(dates.length>=5){
    h+='<tr><td colspan="10" style="font-size:13px;font-weight:bold;padding:8px 12px;color:#1a472a;border-bottom:2px solid #1a472a">'+(tr?'Haftalik Ozet':'Weekly Summary')+'</td></tr>';
    h+='<tr><td colspan="2" style="'+hStyle+'">'+(tr?'Hafta':'Week')+'</td>';
    h+='<td colspan="2" style="'+hStyle+'">'+(tr?'Baslangic':'Start')+'</td>';
    h+='<td colspan="2" style="'+hStyle+'">'+(tr?'Bitis':'End')+'</td>';
    h+='<td colspan="2" style="'+hStyle+'">'+(tr?'Degisim':'Change')+'</td>';
    h+='<td colspan="2" style="'+hStyle+'">%</td></tr>';

    // Group by weeks
    const weeks=[];
    let wi=0;
    while(wi<dates.length){
      const weekEnd=Math.min(wi+4,dates.length-1);
      let startVal=0,endVal=0;
      INSTRS.forEach(ins=>{
        const p0=HISTORY[ins.id]?.[wi],p1=HISTORY[ins.id]?.[weekEnd];
        if(p0===undefined||p1===undefined)return;
        startVal+=ins.id==='dep'?p0:(ins.alloc/ins.buyPrice)*p0;
        endVal+=ins.id==='dep'?p1:(ins.alloc/ins.buyPrice)*p1;
      });
      weeks.push({label:dates[wi]?.slice(5)+' - '+dates[weekEnd]?.slice(5),start:startVal,end:endVal});
      wi+=5;
    }

    weeks.forEach((w,idx)=>{
      const chg=w.end-w.start,pct=w.start?(chg/w.start)*100:0;
      const bg=idx%2===0?'#fff':'#fafaf8';
      const rs=cStyle+'background:'+bg+';';
      const ps=(chg>=0?posStyle:negStyle)+'background:'+bg+';';
      h+='<tr><td colspan="2" style="'+rs+'">'+w.label+'</td>';
      h+='<td colspan="2" style="'+rs+'text-align:right">'+fmt(w.start,0)+' TL</td>';
      h+='<td colspan="2" style="'+rs+'text-align:right">'+fmt(w.end,0)+' TL</td>';
      h+='<td colspan="2" style="'+ps+'">'+(chg>=0?'+':'')+fmt(chg,0)+' TL</td>';
      h+='<td colspan="2" style="'+ps+'">'+(pct>=0?'+':'')+pct.toFixed(2)+'%</td></tr>';
    });

    // Per-instrument weekly values
    h+='<tr><td colspan="10" style="padding:8px"></td></tr>';
    h+='<tr><td colspan="10" style="font-size:13px;font-weight:bold;padding:8px 12px;color:#1a472a;border-bottom:2px solid #1a472a">'+(tr?'Haftalik Enstruman Degerleri':'Weekly Instrument Values')+'</td></tr>';
    h+='<tr><td style="'+hStyle+'">'+(tr?'Hafta':'Week')+'</td>';
    INSTRS.forEach(ins=>{h+='<td style="'+hStyle+'">'+SN(ins)+'</td>';});
    h+='<td style="'+hStyle+'">'+(tr?'Toplam':'Total')+'</td></tr>';
    let wi2=0;
    while(wi2<dates.length){
      const weekEnd=Math.min(wi2+4,dates.length-1);
      const bg=Math.floor(wi2/5)%2===0?'#fff':'#fafaf8';
      h+='<tr><td style="'+cStyle+'background:'+bg+'">'+dates[wi2]?.slice(5)+' - '+dates[weekEnd]?.slice(5)+'</td>';
      let rowTotal=0;
      INSTRS.forEach(ins=>{
        const p=HISTORY[ins.id]?.[weekEnd];
        const val=p!==undefined?(ins.id==='dep'?p:(ins.alloc/ins.buyPrice)*p):ins.alloc;
        rowTotal+=val;
        h+='<td style="'+numStyle+'background:'+bg+'">'+fmt(val,0)+'</td>';
      });
      h+='<td style="'+numStyle+'background:'+bg+';font-weight:bold">'+fmt(rowTotal,0)+'</td></tr>';
      wi2+=5;
    }
  }

  // Daily K/Z tracking
  if(dates.length>=2){
    h+='<tr><td colspan="10" style="padding:8px"></td></tr>';
    h+='<tr><td colspan="10" style="font-size:13px;font-weight:bold;padding:8px 12px;color:#1a472a;border-bottom:2px solid #1a472a">'+(tr?'Gunluk Kar/Zarar Takibi':'Daily P/L Tracking')+'</td></tr>';
    h+='<tr><td style="'+hStyle+'">'+(tr?'Tarih':'Date')+'</td>';
    h+='<td style="'+hStyle+'">'+(tr?'Deger':'Value')+'</td>';
    h+='<td style="'+hStyle+'">'+(tr?'Gunluk K/Z':'Daily P/L')+'</td>';
    h+='<td style="'+hStyle+'">%</td>';
    h+='<td style="'+hStyle+'">'+(tr?'Toplam K/Z':'Total P/L')+'</td>';
    h+='<td style="'+hStyle+'">'+(tr?'Toplam %':'Total %')+'</td></tr>';

    for(let di=0;di<dates.length;di++){
      let dayVal=0;
      INSTRS.forEach(ins=>{
        const p=HISTORY[ins.id]?.[di];
        if(p===undefined){dayVal+=ins.alloc;return;}
        dayVal+=ins.id==='dep'?p:(ins.alloc/ins.buyPrice)*p;
      });
      let prevVal=CAPITAL;
      if(di>0){
        prevVal=0;
        INSTRS.forEach(ins=>{
          const p=HISTORY[ins.id]?.[di-1];
          if(p===undefined){prevVal+=ins.alloc;return;}
          prevVal+=ins.id==='dep'?p:(ins.alloc/ins.buyPrice)*p;
        });
      }
      const dayPL=di>0?dayVal-prevVal:0;
      const dayPct=di>0&&prevVal?((dayPL/prevVal)*100):0;
      const totPL=dayVal-CAPITAL;
      const totPct=(totPL/CAPITAL)*100;
      const bg=di%2===0?'#fff':'#fafaf8';
      const dpS=(dayPL>=0?posStyle:negStyle)+'background:'+bg+';';
      const tpS=(totPL>=0?posStyle:negStyle)+'background:'+bg+';';
      h+='<tr><td style="'+cStyle+'background:'+bg+'">'+dates[di]+'</td>';
      h+='<td style="'+numStyle+'background:'+bg+'">'+fmt(dayVal,0)+'</td>';
      h+='<td style="'+dpS+'">'+(dayPL>=0?'+':'')+fmt(dayPL,0)+'</td>';
      h+='<td style="'+dpS+'">'+(dayPct>=0?'+':'')+dayPct.toFixed(2)+'%</td>';
      h+='<td style="'+tpS+'">'+(totPL>=0?'+':'')+fmt(totPL,0)+'</td>';
      h+='<td style="'+tpS+'">'+(totPct>=0?'+':'')+totPct.toFixed(2)+'%</td></tr>';
    }
  }

  // Daily instrument prices
  if(dates.length>=2){
    h+='<tr><td colspan="10" style="padding:8px"></td></tr>';
    const nCols = INSTRS.length + 1; // date + instruments
    h+='<tr><td colspan="'+nCols+'" style="font-size:13px;font-weight:bold;padding:8px 12px;color:#1a472a;border-bottom:2px solid #1a472a">'+(tr?'Gunluk Enstruman Fiyatlari':'Daily Instrument Prices')+'</td></tr>';
    h+='<tr><td style="'+hStyle+'">'+(tr?'Tarih':'Date')+'</td>';
    INSTRS.forEach(ins=>{
      const shortName = SN(ins);
      h+='<td style="'+hStyle+'">'+shortName+'</td>';
    });
    h+='</tr>';

    for(let di=0;di<dates.length;di++){
      const bg=di%2===0?'#fff':'#fafaf8';
      h+='<tr><td style="'+cStyle+'background:'+bg+'">'+dates[di]+'</td>';
      INSTRS.forEach(ins=>{
        const p=HISTORY[ins.id]?.[di];
        const val=p!==undefined?p:'-';
        const fmtVal=typeof val==='number'?(ins.id==='btc'?fmt(val,0):ins.id==='dep'?fmt(val,0):fmt(val,2)):val;
        h+='<td style="'+numStyle+'background:'+bg+'">'+fmtVal+'</td>';
      });
      h+='</tr>';
    }
  }

  // t-Test Results in Excel
  if(dates.length>=10){
    h+='<tr><td colspan="10" style="padding:8px"></td></tr>';
    h+='<tr><td colspan="10" style="font-size:13px;font-weight:bold;padding:8px 12px;color:#1a472a;border-bottom:2px solid #1a472a">'+(tr?'t-Test Sonuclari (Haftalik Getiriler)':'t-Test Results (Weekly Returns)')+'</td></tr>';

    // Compute weekly returns
    const portVals=dates.map((_,di)=>{let t=0;INSTRS.forEach(ins=>{const p=HISTORY[ins.id]?.[di];if(p===undefined){t+=ins.alloc;return;}t+=ins.id==='dep'?p:(ins.alloc/ins.buyPrice)*p;});return t;});
    const wr=[];
    for(let i=5;i<portVals.length;i+=5){const s=i-5;if(portVals[s]>0)wr.push((portVals[Math.min(i,portVals.length-1)]-portVals[s])/portVals[s]*100);}

    if(wr.length>=2){
      const n=wr.length,mean=wr.reduce((a,b)=>a+b,0)/n;
      const variance=wr.reduce((s,v)=>s+Math.pow(v-mean,2),0)/(n-1);
      const se=Math.sqrt(variance/n);
      const tStat=se>0?mean/se:0;
      const rfW=35.5/52;
      const tStat2=se>0?(mean-rfW)/se:0;
      const tc=n<=20?[0,12.706,4.303,3.182,2.776,2.571,2.447,2.365,2.306,2.262,2.228,2.201,2.179,2.160,2.145,2.131,2.120,2.110,2.101,2.093,2.086][n-1]||2.086:n<=30?2.042:1.960;

      h+='<tr><td style="'+hStyle+'">'+(tr?'Test':'Test')+'</td><td style="'+hStyle+'">'+(tr?'Ortalama':'Mean')+'</td><td style="'+hStyle+'">Std Err</td><td style="'+hStyle+'">t-stat</td><td style="'+hStyle+'">df</td><td style="'+hStyle+'">t-kritik</td><td style="'+hStyle+'">'+(tr?'Sonuc':'Result')+'</td></tr>';

      const r1=Math.abs(tStat)>=tc;
      h+='<tr><td style="'+cStyle+'">'+(tr?'Portfoy ≠ 0':'Portfolio ≠ 0')+'</td>';
      h+='<td style="'+numStyle+'">'+(mean>=0?'+':'')+mean.toFixed(3)+'%</td>';
      h+='<td style="'+numStyle+'">'+se.toFixed(4)+'</td>';
      h+='<td style="'+numStyle+'">'+tStat.toFixed(3)+'</td>';
      h+='<td style="'+numStyle+'">'+(n-1)+'</td>';
      h+='<td style="'+numStyle+'">'+tc.toFixed(3)+'</td>';
      h+='<td style="'+(r1?posStyle:cStyle)+'">'+(r1?(tr?'Anlamli (p<0.05)':'Significant'):(tr?'Anlamli degil':'Not significant'))+'</td></tr>';

      const r2=Math.abs(tStat2)>=tc;
      h+='<tr><td style="'+cStyle+'background:#fafaf8">'+(tr?'Portfoy ≠ Risksiz':'Portfolio ≠ Risk-free')+'</td>';
      h+='<td style="'+numStyle+'background:#fafaf8">'+(mean>=0?'+':'')+mean.toFixed(3)+'%</td>';
      h+='<td style="'+numStyle+'background:#fafaf8">'+se.toFixed(4)+'</td>';
      h+='<td style="'+numStyle+'background:#fafaf8">'+tStat2.toFixed(3)+'</td>';
      h+='<td style="'+numStyle+'background:#fafaf8">'+(n-1)+'</td>';
      h+='<td style="'+numStyle+'background:#fafaf8">'+tc.toFixed(3)+'</td>';
      h+='<td style="'+(r2?negStyle:cStyle)+'background:#fafaf8">'+(r2?(tr?'Anlamli (p<0.05)':'Significant'):(tr?'Anlamli degil':'Not significant'))+'</td></tr>';

      h+='<tr><td colspan="7" style="font-size:8px;color:#999;padding:6px 12px">'+(tr?'α = 0.05 · Cift kuyruklu · n = '+n+' hafta · Risksiz: %35.50/yil':'α = 0.05 · Two-tailed · n = '+n+' weeks · Risk-free: 35.50%/yr')+'</td></tr>';
    }
  }

  // Footer
  h+='<tr><td colspan="10" style="padding:12px;font-size:8px;color:#aaa">'+(tr?'Bu rapor Portfolio Tracker tarafindan olusturulmustur.':'Generated by Portfolio Tracker.')+'</td></tr>';
  h+='</table></body></html>';

  const blob=new Blob([h],{type:'application/vnd.ms-excel;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='portfolio_'+todayStr()+'_'+Date.now()+'.xls';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  showToast(tr?'Excel indirildi':'Excel downloaded');
}

// ════════════════════════════════════════════════════════════════
// EXPORT DROPDOWN MENU
// ════════════════════════════════════════════════════════════════
function toggleExportMenu(e){
  e&&e.stopPropagation();
  const menu=document.getElementById('exportMenu');
  menu.classList.toggle('open');
  if(menu.classList.contains('open')){
    setTimeout(()=>document.addEventListener('click',closeExportMenu,{once:true}),0);
  }
}
function closeExportMenu(){
  document.getElementById('exportMenu')?.classList.remove('open');
}

// ════════════════════════════════════════════════════════════════
// FURKAN EXPORT — 7 alternative instruments, full P/L tracking
// Uses FURKAN_INSTRS, FURKAN_HISTORY, FURKAN_CAPITAL from data.js
// ════════════════════════════════════════════════════════════════
function furkanCurrVal(ins){
  const h=FURKAN_HISTORY[ins.id];
  const p=h&&h.length?h[h.length-1]:(ins.buyPrice||0);
  if(ins.id==='f_dep') return p;
  if(!p||!ins.buyPrice) return ins.alloc;
  return (ins.alloc/ins.buyPrice)*p;
}
function furkanGetQty(ins){
  if(ins.id==='f_dep') return null;
  if(!ins.buyPrice) return null;
  return ins.alloc/ins.buyPrice;
}
function furkanGetPrice(ins){
  const h=FURKAN_HISTORY[ins.id];
  return h&&h.length?h[h.length-1]:(ins.buyPrice||0);
}

function exportFurkanCSV(){
  const tr = LANG==='tr';
  const dateStr=new Date().toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric'});
  const timeStr=new Date().toLocaleTimeString('tr-TR');
  const FI=FURKAN_INSTRS, FH=FURKAN_HISTORY, FC=FURKAN_CAPITAL;

  let total=0; FI.forEach(i=>{total+=furkanCurrVal(i);});
  const tp=total-FC, tpct=tp/FC*100;

  const hStyle='background:#1a472a;color:#fff;font-weight:bold;padding:8px 12px;font-size:11px;border:1px solid #fff;';
  const cStyle='padding:6px 10px;border:1px solid #ddd;font-size:10px;';
  const numStyle=cStyle+'text-align:right;font-family:Consolas,monospace;';
  const posStyle=numStyle+'color:#1a472a;font-weight:bold;';
  const negStyle=numStyle+'color:#c0392b;font-weight:bold;';

  let h='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Furkan Portfolio</x:Name></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>';

  // ── Title section ──
  h+='<table><tr><td colspan="10" style="font-size:18px;font-weight:bold;padding:12px;color:#1a472a;font-family:Georgia,serif">Furkan Portfolio Tracker</td></tr>';
  h+='<tr><td colspan="10" style="font-size:10px;color:#888;padding:4px 12px">'+dateStr+' &middot; '+timeStr+'</td></tr>';
  h+='<tr><td colspan="10" style="font-size:9px;color:#aaa;padding:4px 12px">'+(tr?'Responsible Investment Dersi — 100.000 TL Sermaye':'Responsible Investment Course — 100,000 TL Capital')+'</td></tr>';
  h+='<tr><td colspan="10" style="padding:2px"></td></tr>';

  // ── Summary box ──
  h+='<tr><td colspan="3" style="'+cStyle+'background:#f8f7f2;font-weight:bold">'+(tr?'Toplam Deger':'Total Value')+'</td>';
  h+='<td colspan="2" style="'+numStyle+'background:#f8f7f2;font-weight:bold;font-size:13px">'+fmt(total,2)+' TL</td>';
  h+='<td colspan="2" style="'+cStyle+'background:#f8f7f2;font-weight:bold">'+(tr?'Kar/Zarar':'P/L')+'</td>';
  h+='<td colspan="3" style="'+(tp>=0?posStyle:negStyle)+'background:#f8f7f2;font-size:13px">'+(tp>=0?'+':'')+fmt(tp,2)+' TL ('+tpct.toFixed(2)+'%)</td></tr>';
  h+='<tr><td colspan="10" style="padding:4px"></td></tr>';

  // ── Main table header ──
  h+='<tr><td style="'+hStyle+'">'+(tr?'Enstruman':'Instrument')+'</td>';
  h+='<td style="'+hStyle+'">Ticker</td>';
  h+='<td style="'+hStyle+'">'+(tr?'Agirlik':'Weight')+'</td>';
  h+='<td style="'+hStyle+'">'+(tr?'Yatirilan':'Invested')+'</td>';
  h+='<td style="'+hStyle+'">'+(tr?'Adet':'Qty')+'</td>';
  h+='<td style="'+hStyle+'">'+(tr?'Alis':'Buy')+'</td>';
  h+='<td style="'+hStyle+'">'+(tr?'Guncel':'Current')+'</td>';
  h+='<td style="'+hStyle+'">'+(tr?'Deger':'Value')+'</td>';
  h+='<td style="'+hStyle+'">K/Z</td>';
  h+='<td style="'+hStyle+'">%</td></tr>';

  // ── Data rows ──
  FI.forEach((ins,idx)=>{
    const cv=furkanCurrVal(ins), pl=cv-ins.alloc, pp=ins.alloc?(pl/ins.alloc*100):0;
    const price=furkanGetPrice(ins), qty=furkanGetQty(ins);
    const bg=idx%2===0?'#fff':'#fafaf8';
    const rs=cStyle+'background:'+bg+';';
    const rn=numStyle+'background:'+bg+';';
    const plS=(pl>=0?posStyle:negStyle)+'background:'+bg+';';
    h+='<tr>';
    h+='<td style="'+rs+'font-weight:600;color:'+ins.color+'">'+ins.name+'</td>';
    h+='<td style="'+rs+'">'+ins.ticker+'</td>';
    h+='<td style="'+rn+'">%'+ins.w+'</td>';
    h+='<td style="'+rn+'">'+fmt(ins.alloc,0)+'</td>';
    h+='<td style="'+rn+'">'+(qty?qty.toFixed(ins.id==='f_btc'?6:2):'--')+'</td>';
    h+='<td style="'+rn+'">'+(ins.buyPrice?fmt(ins.buyPrice,2):'--')+'</td>';
    h+='<td style="'+rn+'">'+fmt(ins.id==='f_dep'?cv:price,2)+'</td>';
    h+='<td style="'+rn+'font-weight:600">'+fmt(cv,2)+'</td>';
    h+='<td style="'+plS+'">'+(pl>=0?'+':'')+fmt(pl,2)+'</td>';
    h+='<td style="'+plS+'">'+(pp>=0?'+':'')+pp.toFixed(2)+'%</td>';
    h+='</tr>';
  });

  // ── Total row ──
  h+='<tr><td colspan="7" style="'+hStyle+'background:#2d5a3a">'+(tr?'TOPLAM':'TOTAL')+'</td>';
  h+='<td style="'+hStyle+'background:#2d5a3a;text-align:right;font-size:12px">'+fmt(total,2)+'</td>';
  h+='<td style="'+hStyle+'background:#2d5a3a;text-align:right">'+(tp>=0?'+':'')+fmt(tp,2)+'</td>';
  h+='<td style="'+hStyle+'background:#2d5a3a;text-align:right">'+tpct.toFixed(2)+'%</td></tr>';

  // ── Weekly summary ──
  const dates=FH.dates;
  if(dates&&dates.length>=5){
    h+='<tr><td colspan="10" style="padding:8px"></td></tr>';
    h+='<tr><td colspan="10" style="font-size:13px;font-weight:bold;padding:8px 12px;color:#1a472a;border-bottom:2px solid #1a472a">'+(tr?'Haftalik Ozet':'Weekly Summary')+'</td></tr>';
    h+='<tr><td colspan="2" style="'+hStyle+'">'+(tr?'Hafta':'Week')+'</td>';
    h+='<td colspan="2" style="'+hStyle+'">'+(tr?'Baslangic':'Start')+'</td>';
    h+='<td colspan="2" style="'+hStyle+'">'+(tr?'Bitis':'End')+'</td>';
    h+='<td colspan="2" style="'+hStyle+'">'+(tr?'Degisim':'Change')+'</td>';
    h+='<td colspan="2" style="'+hStyle+'">%</td></tr>';

    const weeks=[];
    let wi=0;
    while(wi<dates.length){
      const weekEnd=Math.min(wi+4,dates.length-1);
      let startVal=0,endVal=0;
      FI.forEach(ins=>{
        const p0=FH[ins.id]?.[wi],p1=FH[ins.id]?.[weekEnd];
        if(p0===undefined||p1===undefined)return;
        startVal+=ins.id==='f_dep'?p0:(ins.alloc/ins.buyPrice)*p0;
        endVal+=ins.id==='f_dep'?p1:(ins.alloc/ins.buyPrice)*p1;
      });
      weeks.push({label:dates[wi]?.slice(5)+' - '+dates[weekEnd]?.slice(5),start:startVal,end:endVal});
      wi+=5;
    }

    weeks.forEach((w,idx)=>{
      const chg=w.end-w.start,pct=w.start?(chg/w.start)*100:0;
      const bg=idx%2===0?'#fff':'#fafaf8';
      const rs=cStyle+'background:'+bg+';';
      const ps=(chg>=0?posStyle:negStyle)+'background:'+bg+';';
      h+='<tr><td colspan="2" style="'+rs+'">'+w.label+'</td>';
      h+='<td colspan="2" style="'+rs+'text-align:right">'+fmt(w.start,0)+' TL</td>';
      h+='<td colspan="2" style="'+rs+'text-align:right">'+fmt(w.end,0)+' TL</td>';
      h+='<td colspan="2" style="'+ps+'">'+(chg>=0?'+':'')+fmt(chg,0)+' TL</td>';
      h+='<td colspan="2" style="'+ps+'">'+(pct>=0?'+':'')+pct.toFixed(2)+'%</td></tr>';
    });

    // Per-instrument weekly values
    h+='<tr><td colspan="10" style="padding:8px"></td></tr>';
    h+='<tr><td colspan="10" style="font-size:13px;font-weight:bold;padding:8px 12px;color:#1a472a;border-bottom:2px solid #1a472a">'+(tr?'Haftalik Enstruman Degerleri':'Weekly Instrument Values')+'</td></tr>';
    h+='<tr><td style="'+hStyle+'">'+(tr?'Hafta':'Week')+'</td>';
    FI.forEach(ins=>{h+='<td style="'+hStyle+'">'+ins.name.split(/[—(]/)[0].trim()+'</td>';});
    h+='<td style="'+hStyle+'">'+(tr?'Toplam':'Total')+'</td></tr>';
    let wi2=0;
    while(wi2<dates.length){
      const weekEnd=Math.min(wi2+4,dates.length-1);
      const bg=Math.floor(wi2/5)%2===0?'#fff':'#fafaf8';
      h+='<tr><td style="'+cStyle+'background:'+bg+'">'+dates[wi2]?.slice(5)+' - '+dates[weekEnd]?.slice(5)+'</td>';
      let rowTotal=0;
      FI.forEach(ins=>{
        const p=FH[ins.id]?.[weekEnd];
        const val=p!==undefined?(ins.id==='f_dep'?p:(ins.alloc/ins.buyPrice)*p):ins.alloc;
        rowTotal+=val;
        h+='<td style="'+numStyle+'background:'+bg+'">'+fmt(val,0)+'</td>';
      });
      h+='<td style="'+numStyle+'background:'+bg+';font-weight:bold">'+fmt(rowTotal,0)+'</td></tr>';
      wi2+=5;
    }
  }

  // ── Daily P/L tracking ──
  if(dates&&dates.length>=2){
    h+='<tr><td colspan="10" style="padding:8px"></td></tr>';
    h+='<tr><td colspan="10" style="font-size:13px;font-weight:bold;padding:8px 12px;color:#1a472a;border-bottom:2px solid #1a472a">'+(tr?'Gunluk Kar/Zarar Takibi':'Daily P/L Tracking')+'</td></tr>';
    h+='<tr><td style="'+hStyle+'">'+(tr?'Tarih':'Date')+'</td>';
    h+='<td style="'+hStyle+'">'+(tr?'Deger':'Value')+'</td>';
    h+='<td style="'+hStyle+'">'+(tr?'Gunluk K/Z':'Daily P/L')+'</td>';
    h+='<td style="'+hStyle+'">%</td>';
    h+='<td style="'+hStyle+'">'+(tr?'Toplam K/Z':'Total P/L')+'</td>';
    h+='<td style="'+hStyle+'">'+(tr?'Toplam %':'Total %')+'</td></tr>';

    for(let di=0;di<dates.length;di++){
      let dayVal=0;
      FI.forEach(ins=>{
        const p=FH[ins.id]?.[di];
        if(p===undefined){dayVal+=ins.alloc;return;}
        dayVal+=ins.id==='f_dep'?p:(ins.alloc/ins.buyPrice)*p;
      });
      let prevVal=FC;
      if(di>0){
        prevVal=0;
        FI.forEach(ins=>{
          const p=FH[ins.id]?.[di-1];
          if(p===undefined){prevVal+=ins.alloc;return;}
          prevVal+=ins.id==='f_dep'?p:(ins.alloc/ins.buyPrice)*p;
        });
      }
      const dayPL=di>0?dayVal-prevVal:0;
      const dayPct=di>0&&prevVal?((dayPL/prevVal)*100):0;
      const totPL=dayVal-FC;
      const totPct=(totPL/FC)*100;
      const bg=di%2===0?'#fff':'#fafaf8';
      const dpS=(dayPL>=0?posStyle:negStyle)+'background:'+bg+';';
      const tpS=(totPL>=0?posStyle:negStyle)+'background:'+bg+';';
      h+='<tr><td style="'+cStyle+'background:'+bg+'">'+dates[di]+'</td>';
      h+='<td style="'+numStyle+'background:'+bg+'">'+fmt(dayVal,0)+'</td>';
      h+='<td style="'+dpS+'">'+(dayPL>=0?'+':'')+fmt(dayPL,0)+'</td>';
      h+='<td style="'+dpS+'">'+(dayPct>=0?'+':'')+dayPct.toFixed(2)+'%</td>';
      h+='<td style="'+tpS+'">'+(totPL>=0?'+':'')+fmt(totPL,0)+'</td>';
      h+='<td style="'+tpS+'">'+(totPct>=0?'+':'')+totPct.toFixed(2)+'%</td></tr>';
    }
  }

  // ── Daily instrument prices ──
  if(dates&&dates.length>=2){
    h+='<tr><td colspan="10" style="padding:8px"></td></tr>';
    const nCols=FI.length+1;
    h+='<tr><td colspan="'+nCols+'" style="font-size:13px;font-weight:bold;padding:8px 12px;color:#1a472a;border-bottom:2px solid #1a472a">'+(tr?'Gunluk Enstruman Fiyatlari':'Daily Instrument Prices')+'</td></tr>';
    h+='<tr><td style="'+hStyle+'">'+(tr?'Tarih':'Date')+'</td>';
    FI.forEach(ins=>{h+='<td style="'+hStyle+'">'+ins.name.split(/[—(]/)[0].trim()+'</td>';});
    h+='</tr>';

    for(let di=0;di<dates.length;di++){
      const bg=di%2===0?'#fff':'#fafaf8';
      h+='<tr><td style="'+cStyle+'background:'+bg+'">'+dates[di]+'</td>';
      FI.forEach(ins=>{
        const p=FH[ins.id]?.[di];
        const val=p!==undefined?p:'-';
        const fmtVal=typeof val==='number'?(ins.id==='f_btc'?fmt(val,0):ins.id==='f_dep'?fmt(val,0):fmt(val,2)):val;
        h+='<td style="'+numStyle+'background:'+bg+'">'+fmtVal+'</td>';
      });
      h+='</tr>';
    }
  }

  // ── Footer ──
  h+='<tr><td colspan="10" style="padding:8px"></td></tr>';
  h+='<tr><td colspan="10" style="padding:8px 12px;font-size:8px;color:#aaa">'+(tr?'Bu rapor Portfolio Tracker (Furkan Portfoyu) tarafindan olusturulmustur. Egitim amaclidir, yatirim tavsiyesi degildir.':'Generated by Portfolio Tracker (Furkan Portfolio). For educational purposes only, not investment advice.')+'</td></tr>';
  h+='</table></body></html>';

  const blob=new Blob([h],{type:'application/vnd.ms-excel;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='furkan_portfolio_'+todayStr()+'_'+Date.now()+'.xls';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  showToast(tr?'Furkan Excel indirildi':'Furkan Excel downloaded');
}

// ════════════════════════════════════════════════════════════════
// RENDER
// ════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════
// SPARKLINE — mini SVG trend line in table
// ════════════════════════════════════════════════════════════════
function buildSparkline(ins){
  const arr = HISTORY[ins.id];
  if(!arr||arr.length<2) return '';
  const data = arr.slice(-7); // last 7 points
  const mn=Math.min(...data), mx=Math.max(...data);
  const range=mx-mn||1;
  const w=40, h=16;
  const pts=data.map((v,i)=>{
    const x=(i/(data.length-1))*w;
    const y=h-((v-mn)/range)*h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const last=data[data.length-1], first=data[0];
  const color=last>=first?'var(--success)':'var(--danger)';
  return `<svg class="sparkline-svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

// ════════════════════════════════════════════════════════════════
// TABLE SORT TOGGLE
// ════════════════════════════════════════════════════════════════
let tableSortMode = 'default'; // 'default' | 'weight' | 'pnl'
const INSTRS_ORIGINAL = null; // will store original order

function toggleTableSort(){
  const modes = ['default','weight','pnl'];
  const idx = modes.indexOf(tableSortMode);
  tableSortMode = modes[(idx+1)%modes.length];
  const btn = document.getElementById('sortBtn');
  if(tableSortMode==='default'){
    btn.classList.remove('active');
    btn.textContent='↕';
    btn.title=LANG==='tr'?'Agirliga gore sirala':'Sort by weight';
  } else if(tableSortMode==='weight'){
    btn.classList.add('active');
    btn.textContent='%';
    btn.title=LANG==='tr'?'K/Z sirala':'Sort by P/L';
  } else {
    btn.classList.add('active');
    btn.textContent='±';
    btn.title=LANG==='tr'?'Varsayilan sira':'Default order';
  }
  renderTable();
  applyFlashEffects();
}

function getSortedInstrs(){
  if(tableSortMode==='weight') return [...INSTRS].sort((a,b)=>b.w-a.w);
  if(tableSortMode==='pnl') return [...INSTRS].sort((a,b)=>pnlPct(b)-pnlPct(a));
  return INSTRS;
}

// ════════════════════════════════════════════════════════════════
// HERO BADGE — top performer floating icon
// ════════════════════════════════════════════════════════════════
const HERO_ICONS = {btc:'₿',thyao:'THYAO',asels:'ASELS',gold:'Au',bond:'BND',fund:'BIO',dep:'DEP'};

function renderHeroBadge(){
  const el = document.getElementById('heroBadge');
  if(!el) return;
  let bestI=INSTRS[0];
  INSTRS.forEach(i=>{if(pnlPct(i)>pnlPct(bestI))bestI=i;});
  const pp = pnlPct(bestI);
  if(pp<=0){el.classList.remove('show');return;}

  const icon = HERO_ICONS[bestI.id]||'?';
  const name = SN(bestI);

  el.innerHTML = `
    <div class="hero-icon" style="background:${bestI.color};color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.62rem;font-weight:800;letter-spacing:-0.02em">${icon}</div>
    <div class="hero-meta">
      <div class="hero-name" style="color:${bestI.color}">${name}</div>
      <div class="hero-pct pos">+${pp.toFixed(2)}%</div>
    </div>
  `;
  el.classList.add('show');
  el.style.animation='none';
  requestAnimationFrame(()=>{el.style.animation='';});
}

// ════════════════════════════════════════════════════════════════
// SIDE PANEL TOGGLE (mobile)
// ════════════════════════════════════════════════════════════════
function toggleSidePanel(){
  const panel=document.querySelector('.side-panel');
  const overlay=document.getElementById('sideOverlay');
  const btn=document.getElementById('sideToggle');
  if(!panel)return;
  const open=panel.classList.toggle('open');
  overlay.classList.toggle('open',open);
  btn.textContent=open?'✕':'☰';
}

function renderAll(){
  // Save prices before render for flash comparison
  savePricesForFlash();
  renderSummary();renderTable();renderChart();renderDonut();renderWeeks();renderLog();renderESG();renderRisk();renderCorrelation();updateMarketStatus();renderHeroBadge();
  // Apply flash after DOM is rebuilt
  applyFlashEffects();
}

function renderSummary(){
  let total=0;INSTRS.forEach(i=>{total+=currVal(i);});
  const tp=total-CAPITAL,tpct=tp/CAPITAL*100;
  const sumEl = document.getElementById('sumTotal');
  if(LANG==='en') animateCountUp(sumEl, toUsd(total), '$', '', 2);
  else animateCountUp(sumEl, total, '', ' TL', 2);
  const pe=document.getElementById('sumPnl');
  pe.className='sum-value pulse-value '+(tp>=0?'pos':'neg');
  if(LANG==='en') animateCountUp(pe, toUsd(tp), tp>=0?'+$':'-$', '', 2);
  else animateCountUp(pe, Math.abs(tp), tp>=0?'+':'−', ' TL', 2);
  document.getElementById('sumPct').textContent=fmtP(tpct);
  let bestI=INSTRS[0],worstI=INSTRS[0];
  INSTRS.forEach(i=>{if(pnlPct(i)>pnlPct(bestI))bestI=i;if(pnlPct(i)<pnlPct(worstI))worstI=i;});
  document.getElementById('sumBest').textContent=SN(bestI);
  document.getElementById('sumBestSub').textContent=fmtP(pnlPct(bestI));
  document.getElementById('sumWorst').textContent=SN(worstI);
  document.getElementById('sumWorstSub').textContent=fmtP(pnlPct(worstI));
  // Add tooltip with calculation detail
  const bestSrc=livePrices[bestI.id]?.src||'HISTORY';
  const worstSrc=livePrices[worstI.id]?.src||'HISTORY';
  document.getElementById('sumBest').title=`${SN(bestI)}: ${fmt(getLatestPrice(bestI.id),2)} (${bestSrc}) | Alis: ${fmt(bestI.buyPrice,2)} | K/Z: ${fmtP(pnlPct(bestI))}`;
  document.getElementById('sumWorst').title=`${SN(worstI)}: ${fmt(getLatestPrice(worstI.id),2)} (${worstSrc}) | Alis: ${fmt(worstI.buyPrice,2)} | K/Z: ${fmtP(pnlPct(worstI))}`;
  // Debug: log all instruments P/L for verification
  console.table(INSTRS.map(i=>({name:SN(i),price:getLatestPrice(i.id),src:livePrices[i.id]?.src||'HISTORY',alloc:i.alloc,currVal:Math.round(currVal(i)),pnl:Math.round(pnlVal(i)),pnlPct:pnlPct(i).toFixed(2)+'%'})));
  const dateFmt = LANG==='tr' ? {day:'2-digit',month:'long',year:'numeric'} : {month:'long',day:'numeric',year:'numeric'};
  document.getElementById('tblDate').textContent=new Date().toLocaleDateString(LANG==='tr'?'tr-TR':'en-US',dateFmt);
  checkATH();

  // Mini trend lines in summary cards
  const dates=HISTORY.dates;
  if(dates.length>=3){
    const totals=dates.map((_,di)=>{let t=0;INSTRS.forEach(ins=>{const p=HISTORY[ins.id]?.[di];if(p===undefined){t+=ins.alloc;return;}t+=ins.id==='dep'?p:(ins.alloc/ins.buyPrice)*p;});return t;});
    const w=120,h2=24;
    function miniSVG(data,color){
      const mn=Math.min(...data),mx=Math.max(...data),rng=mx-mn||1;
      const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h2-((v-mn)/rng)*h2}`).join(' ');
      return `<svg width="${w}" height="${h2}" viewBox="0 0 ${w} ${h2}" style="display:block;opacity:0.5"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/></svg>`;
    }
    const sumT=document.getElementById('sumTrend');
    if(sumT) sumT.innerHTML=miniSVG(totals,'var(--accent)');
    const pnls=totals.map(v=>v-CAPITAL);
    const pnlT=document.getElementById('pnlTrend');
    if(pnlT) pnlT.innerHTML=miniSVG(pnls,tp>=0?'var(--success)':'var(--danger)');
  }
}

function renderTable(){
  // Header with Qty column
  document.getElementById('instrHead').innerHTML = `<th>${t('thInstr')}</th><th>${t('thWeight')}</th><th>${t('thInvested')}</th><th>${t('thQty')}</th><th>${t('thPrice')}</th><th>${t('thValue')}</th><th>${t('thPnl')}</th><th>${t('thChg')}</th><th style="width:44px"></th>`;

  const tb=document.getElementById('instrBody');tb.innerHTML='';
  getSortedInstrs().forEach(ins=>{
    const cv=currVal(ins),pl=pnlVal(ins),pp=pnlPct(ins),price=getLatestPrice(ins.id);
    const isApi=livePrices[ins.id]?.src&&livePrices[ins.id].src!=='geçmiş veri'&&livePrices[ins.id].src!=='history';
    const isManual=['bond','fund','dep'].includes(ins.id);
    const srcCls=isApi?'src-badge src-api':isManual?'src-badge src-calc':'src-badge src-old';
    const srcLabel=isApi?livePrices[ins.id].src:(LANG==='tr'?'geçmiş veri':'history');
    const priceCur = LANG==='en' ? '$' : ' TL';
    const pFmt=ins.id==='dep'?fmtCur(cv):
      LANG==='en'?(ins.id==='btc'?'$'+fmt(toUsd(price),0):ins.id==='gold'?'$'+fmt(toUsd(price),0):'$'+fmt(toUsd(price),2)):
      (ins.id==='btc'?fmt(price,0)+' TL':ins.id==='gold'?fmt(price,0)+' TL':fmt(price,2)+' TL');

    // Quantity
    const qty = getQty(ins);
    let qtyStr = '--';
    if(qty !== null){
      if(ins.id==='btc') qtyStr = fmt(qty,6) + ' BTC';
      else if(ins.id==='gold') qtyStr = fmt(qty,4) + ' gr';
      else if(ins.id==='bond') qtyStr = fmt(qty,2) + ' ' + (LANG==='tr'?'lot':'lot');
      else if(ins.id==='fund') qtyStr = fmt(qty,2) + ' ' + (LANG==='tr'?'pay':'unit');
      else qtyStr = fmt(qty,2) + ' ' + (LANG==='tr'?'adet':'pcs');
    }

    // External link
    const linkHtml = ins.link
      ? `<a href="${ins.link}" target="_blank" rel="noopener" class="ext-link" title="${LANG==='tr'?'Detay / Grafik':'Detail / Chart'}">↗</a>`
      : '';

    // Bond tooltip
    const bondTip = ins.id==='bond' ? ` title="${LANG==='tr'?'Nominal bazlı: 100 TL par + günlük kupon tahakkuku. Investing.com sayfasındaki %33 getiri (yield) ile karıştırmayın.':'Nominal based: 100 TL par + daily coupon accrual. Not the 33% yield shown on Investing.com.'}"` : '';

    const tr=document.createElement('tr');
    tr.innerHTML=`<td><div class="iname-row"><span class="iname" style="color:${ins.color};cursor:pointer" onclick="openDetail('${ins.id}')">${L(ins.name)}</span>${linkHtml}</div><span class="isub">${ins.ticker} · ${L(ins.desc)}</span><span class="badge ${ins.tc}">${L(ins.tag)}</span></td>
      <td class="neutral">%${ins.w}</td><td class="neutral">${fmtCur(ins.alloc)}</td>
      <td class="neutral" style="font-size:0.65rem">${qtyStr}</td>
      <td class="${pp>=0?'pos':'neg'}"${bondTip}>${pFmt}${priceChanges[ins.id]?'<span class="price-arrow '+(priceChanges[ins.id]>0?'up':'down')+'">'+(priceChanges[ins.id]>0?'▲':'▼')+'</span>':''} <span class="${srcCls}">${srcLabel}</span></td>
      <td class="neutral">${fmtCur(cv)}</td><td class="${pl>=0?'pos':'neg'}">${pl>=0?'+':''}${fmtCur(pl)}</td>
      <td class="${pp>=0?'pos':'neg'}">${fmtP(pp)}</td>
      <td style="padding:4px 6px;width:44px">${buildSparkline(ins)}</td>`;
    tb.appendChild(tr);
  });
  staggerRows();
}

function renderChart(){
  const dates=HISTORY.dates;if(dates.length<2)return;
  const ctx=document.getElementById('mainChart').getContext('2d');
  if(mainChart)mainChart.destroy();
  const labels=dates.map(d=>d.slice(5).replace('-','/'));
  let datasets=[];
  if(curChartTab==='portfolio'){
    const data=dates.map((_,di)=>{let tt=0;INSTRS.forEach(ins=>{const p=HISTORY[ins.id]?.[di];if(p===undefined){tt+=ins.alloc;return;}tt+=ins.id==='dep'?p:(ins.alloc/ins.buyPrice)*p;});return tt;});
    datasets=[{label:LANG==='tr'?'Toplam Portföy':'Total Portfolio',data,borderColor:'#1a472a',backgroundColor:'rgba(26,71,42,0.07)',borderWidth:2,fill:true,tension:0.3,pointRadius:2,pointHoverRadius:5,pointBackgroundColor:'#1a472a'},
      {label:LANG==='tr'?'Başlangıç':'Starting',data:dates.map(()=>CAPITAL),borderColor:'#c9a84c',borderWidth:1.5,borderDash:[4,4],fill:false,tension:0,pointRadius:0}];
  } else if(curChartTab==='individual'){
    datasets=INSTRS.map(ins=>({label:SN(ins),data:dates.map((_,di)=>{const p=HISTORY[ins.id]?.[di];if(p===undefined)return ins.alloc;return ins.id==='dep'?p:(ins.alloc/ins.buyPrice)*p;}),borderColor:ins.color,borderWidth:1.5,fill:false,tension:0.3,pointRadius:0,pointHoverRadius:3}));
  } else {
    datasets=INSTRS.filter(i=>i.id!=='dep'&&i.id!=='bond').map(ins=>({label:SN(ins),data:dates.map((_,di)=>{const p=HISTORY[ins.id]?.[di],b=HISTORY[ins.id]?.[0];if(!p||!b)return 0;return((p-b)/b)*100;}),borderColor:ins.color,borderWidth:2,fill:false,tension:0.3,pointRadius:2,pointHoverRadius:4,pointBackgroundColor:ins.color}));
    datasets.push({label:LANG==='tr'?'Sıfır':'Zero',data:dates.map(()=>0),borderColor:'rgba(0,0,0,0.15)',borderWidth:1,borderDash:[3,3],fill:false,tension:0,pointRadius:0});
  }
  mainChart=new Chart(ctx,{type:'line',data:{labels,datasets},options:{responsive:true,
    interaction:{mode:'index',intersect:false},
    hover:{mode:'index',intersect:false},
    elements:{line:{borderJoinStyle:'round'},point:{hoverBorderWidth:2}},
    animation:{duration:800,easing:'easeOutQuart'},
    plugins:{legend:{display:curChartTab!=='portfolio',labels:{font:{family:'Geist Mono',size:9},color:'#5a5448',boxWidth:10,padding:10}},
      tooltip:{backgroundColor:'#1a1814',titleColor:'#e8ede8',bodyColor:'#9aa89a',borderColor:'#2a2f2a',borderWidth:1,titleFont:{family:'Geist Mono',size:10},bodyFont:{family:'Geist Mono',size:9},
        callbacks:{label:c=>curChartTab==='normalized'?` ${c.dataset.label}: ${c.raw>=0?'+':''}${c.raw.toFixed(2)}%`:` ${c.dataset.label}: ${LANG==='en'?'$'+fmt(toUsd(c.raw)):fmt(c.raw)+' TL'}`}}},
    scales:{x:{grid:{color:'rgba(0,0,0,0.04)'},ticks:{font:{family:'Geist Mono',size:8},color:'#8a8070',maxRotation:0}},
      y:{grid:{color:'rgba(0,0,0,0.04)'},ticks:{font:{family:'Geist Mono',size:8},color:'#8a8070',callback:v=>curChartTab==='normalized'?v.toFixed(1)+'%':(LANG==='en'?'$'+fmtShort(toUsd(v)):fmtShort(v))}}}}});
}

function renderDonut(){
  const vals=INSTRS.map(i=>currVal(i)),total=vals.reduce((a,b)=>a+b,0);
  const svg=document.getElementById('donutSvg');
  const detailEl = document.getElementById('donutDetail');
  const labelNames = INSTRS.map(i=>SN(i));

  // SVG donut params
  const cx=90, cy=90, r=62; // center and radius
  const circ = 2 * Math.PI * r; // circumference

  function showDefault(){
    const centerVal = LANG==='en' ? '$'+fmt(toUsd(total),0) : fmt(total,0);
    document.getElementById('donutVal').textContent=centerVal;
    document.getElementById('donutLbl').textContent=LANG==='en'?'USD':'TL';
    detailEl.className='donut-detail empty';
    detailEl.innerHTML=`<div style="font-size:0.62rem;color:var(--muted);text-align:center;padding:6px 0">${LANG==='tr'?'Dilimin uzerine gelin':'Hover over a slice'}</div>`;
    // Reset all slices
    svg.querySelectorAll('.donut-slice').forEach(s=>s.classList.remove('dimmed'));
  }

  function showDetail(idx){
    const ins=INSTRS[idx], val=vals[idx], pct=total>0?((val/total)*100):0;
    const price=getLatestPrice(ins.id);
    const display = LANG==='en' ? '$'+fmt(toUsd(val),0) : fmt(val,0)+' TL';
    const priceDisplay = LANG==='en'
      ? (ins.id==='dep'?display:'$'+fmt(toUsd(price),ins.id==='btc'||ins.id==='gold'?0:2))
      : (ins.id==='dep'?display:fmt(price,ins.id==='btc'||ins.id==='gold'?0:2)+' TL');
    const pl=pnlVal(ins), pp=pnlPct(ins);
    const plDisplay = LANG==='en' ? '$'+fmt(toUsd(Math.abs(pl)),2) : fmt(Math.abs(pl),2)+' TL';

    document.getElementById('donutVal').textContent=display;
    document.getElementById('donutLbl').textContent=`%${pct.toFixed(1)}`;

    detailEl.className='donut-detail';
    detailEl.innerHTML=`
      <div class="dd-name" style="color:${ins.color}">${L(ins.name)}</div>
      <div class="dd-row"><span>${LANG==='tr'?'Fiyat':'Price'}</span><span class="dd-val">${priceDisplay}</span></div>
      <div class="dd-row"><span>${LANG==='tr'?'Deger':'Value'}</span><span class="dd-val">${display}</span></div>
      <div class="dd-row"><span>K/Z</span><span class="dd-val ${pl>=0?'pos':'neg'}">${pl>=0?'+':'-'}${plDisplay} (${fmtP(pp)})</span></div>
      <div class="dd-bar"><div class="dd-fill" style="width:${pct}%;background:${ins.color}"></div></div>
    `;
    // Dim other slices
    svg.querySelectorAll('.donut-slice').forEach((s,i)=>{
      if(i===idx) s.classList.remove('dimmed');
      else s.classList.add('dimmed');
    });
  }

  // Build SVG circles
  let offset = 0;
  let svgHtml = '';
  INSTRS.forEach((ins, idx) => {
    const pct = total>0 ? vals[idx]/total : 0;
    const dash = pct * circ;
    const gap = circ - dash;
    svgHtml += `<circle class="donut-slice" cx="${cx}" cy="${cy}" r="${r}"
      stroke="${ins.color}" stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-offset}"
      data-idx="${idx}"
      onmouseenter="donutSliceHover(${idx})" onmouseleave="donutSliceLeave()"/>`;
    offset += dash;
  });
  svg.innerHTML = svgHtml;

  // Animate in — stagger each slice
  setTimeout(()=>{
    svg.querySelectorAll('.donut-slice').forEach((s,i)=>{
      s.style.strokeDasharray='0 '+circ;
      s.style.transition='none';
      requestAnimationFrame(()=>{
        s.style.transition=`stroke-dasharray 0.6s ease ${i*0.08}s, stroke-width 0.25s ease, opacity 0.25s ease`;
        const pct=total>0?vals[i]/total:0;
        const dash=pct*circ;
        s.style.strokeDasharray=dash+' '+(circ-dash);
      });
    });
  },50);

  showDefault();

  document.getElementById('allocLegend').innerHTML=INSTRS.map((i,idx)=>{
    const pct=(vals[idx]/total*100).toFixed(1);
    return `<div class="alloc-row" onmouseenter="donutSliceHover(${idx})" onmouseleave="donutSliceLeave()"><div class="alloc-dot" style="background:${i.color}"></div><span style="flex:1;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${labelNames[idx]}</span><span style="color:var(--text);font-weight:500;margin-left:6px">%${pct}</span></div><div class="alloc-bar-wrap"><div class="alloc-bar-fill" style="width:${pct}%;background:${i.color}"></div></div>`;
  }).join('');

  // Store for hover functions
  window._donutShowDetail = showDetail;
  window._donutShowDefault = showDefault;
}

function donutSliceHover(idx){
  if(window._donutShowDetail) window._donutShowDetail(idx);
}
function donutSliceLeave(){
  if(window._donutShowDefault) window._donutShowDefault();
}

function renderWeeks(){
  const c=document.getElementById('weekCards');
  const dates=HISTORY.dates;
  if(dates.length<2){c.innerHTML=`<div style="color:var(--muted);font-size:0.66rem">${t('noData')}</div>`;return;}

  // Weeks = every 7 calendar days from START_DATE
  // Week 1: day 0-6 (Feb 17-23), Week 2: day 7-13 (Feb 24 - Mar 2), etc.
  const startMs = new Date(START_DATE).getTime();
  const weeks = [];

  for(let i=0;i<dates.length;i++){
    const daysSinceStart = Math.floor((new Date(dates[i]).getTime() - startMs) / 86400000);
    const weekNum = Math.floor(daysSinceStart / 7) + 1;

    if(weeks.length === 0 || weeks[weeks.length-1].num !== weekNum){
      // Calculate exact week boundaries (calendar)
      const weekStartDay = (weekNum - 1) * 7;
      const weekEndDay = weekStartDay + 6;
      const ws = new Date(startMs + weekStartDay * 86400000);
      const we = new Date(startMs + weekEndDay * 86400000);
      weeks.push({
        num: weekNum,
        startIdx: i,
        endIdx: i,
        startDate: ws.toISOString().slice(0,10),
        endDate: we.toISOString().slice(0,10),
        complete: false // will be set below
      });
    }
    weeks[weeks.length-1].endIdx = i;
  }

  // Mark week as complete if current date > week end date
  const todayMs = new Date(todayStr()).getTime();
  weeks.forEach(w => {
    w.complete = todayMs > new Date(w.endDate).getTime();
  });

  // Only show complete weeks (7 calendar days elapsed)
  const showWeeks = weeks.filter(w => w.complete);

  // Show complete weeks + current in-progress week
  const inProgressWeek = weeks.find(w => !w.complete);

  c.innerHTML = showWeeks.map(w=>{
    let startTotal=0, endTotal=0;
    INSTRS.forEach(ins=>{
      const sp=HISTORY[ins.id]?.[w.startIdx], ep=HISTORY[ins.id]?.[w.endIdx];
      startTotal += sp!==undefined ? (ins.id==='dep'?sp:(ins.alloc/ins.buyPrice)*sp) : ins.alloc;
      endTotal   += ep!==undefined ? (ins.id==='dep'?ep:(ins.alloc/ins.buyPrice)*ep) : ins.alloc;
    });
    const wp=endTotal-startTotal;
    const wpct=startTotal>0?((wp/startTotal)*100):0;

    let best={name:'',pct:-Infinity}, worst={name:'',pct:Infinity};
    INSTRS.forEach(ins=>{
      const sp=HISTORY[ins.id]?.[w.startIdx], ep=HISTORY[ins.id]?.[w.endIdx];
      if(sp && ep && sp>0){
        const pct=((ep-sp)/sp)*100;
        if(pct>best.pct) best={name:SN(ins),pct};
        if(pct<worst.pct) worst={name:SN(ins),pct};
      }
    });

    const fmtDate=d=>new Date(d).toLocaleDateString(LANG==='tr'?'tr-TR':'en-US',{day:'numeric',month:'short'});
    const notes = WEEK_NOTES[w.num];
    const domNote = notes?.domestic ? (typeof notes.domestic === 'object' ? (notes.domestic[LANG]||notes.domestic.tr) : notes.domestic) : '';
    const intlNote = notes?.international ? (typeof notes.international === 'object' ? (notes.international[LANG]||notes.international.tr) : notes.international) : '';

    return `<div class="week-card ${wp<0?'neg-card':''}">
      <div class="wk-header">
        <div>
          <div class="wk-num">${t('week')} ${w.num}</div>
          <div style="font-size:0.66rem;color:var(--muted);margin-top:2px">${fmtDate(w.startDate)} → ${fmtDate(w.endDate)}</div>
        </div>
        <div style="text-align:right">
          <div class="wk-pnl ${wp>=0?'pos':'neg'}">${wp>=0?'+':''}${fmtCur(wp)}</div>
          <div style="font-size:0.62rem;color:var(--muted)">${fmtP(wpct)}</div>
        </div>
      </div>
      <div style="display:flex;gap:12px;margin:8px 0;font-size:0.66rem">
        <span class="pos">▲ ${best.name} ${fmtP(best.pct)}</span>
        <span class="neg">▼ ${worst.name} ${fmtP(worst.pct)}</span>
      </div>
      ${(domNote || intlNote) ? `
        <div class="wk-note">
          <div class="wk-section-label">🇹🇷 ${t('domestic')}</div>
          <div style="margin-bottom:8px">${domNote || '<em style="color:var(--muted)">—</em>'}</div>
          <div class="wk-section-label">${t('international')}</div>
          <div>${intlNote || '<em style="color:var(--muted)">—</em>'}</div>
        </div>
      ` : `<div class="wk-note" style="color:var(--muted);font-style:italic">${t('noComment')}</div>`}
    </div>`;
  }).join('');

  // Add in-progress week if exists
  if(inProgressWeek){
    const ipw = inProgressWeek;
    let ipStart=0, ipEnd=0;
    INSTRS.forEach(ins=>{
      const sp=HISTORY[ins.id]?.[ipw.startIdx], ep=HISTORY[ins.id]?.[ipw.endIdx];
      ipStart += sp!==undefined ? (ins.id==='dep'?sp:(ins.alloc/ins.buyPrice)*sp) : ins.alloc;
      ipEnd += ep!==undefined ? (ins.id==='dep'?ep:(ins.alloc/ins.buyPrice)*ep) : ins.alloc;
    });
    const ipPnl=ipEnd-ipStart, ipPct=ipStart>0?((ipPnl/ipStart)*100):0;
    const daysElapsed = Math.floor((todayMs - new Date(ipw.startDate).getTime()) / 86400000) + 1;
    const fmtD=d=>new Date(d).toLocaleDateString(LANG==='tr'?'tr-TR':'en-US',{day:'numeric',month:'short'});
    c.innerHTML += `<div class="week-card" style="border-left-color:var(--gold);opacity:0.85">
      <div class="wk-header">
        <div>
          <div class="wk-num">${t('week')} ${ipw.num} <span style="font-size:0.5rem;color:var(--gold);font-weight:400">⏳ ${LANG==='tr'?'devam ediyor':'in progress'}</span></div>
          <div style="font-size:0.66rem;color:var(--muted);margin-top:2px">${fmtD(ipw.startDate)} → ${fmtD(ipw.endDate)} · ${LANG==='tr'?'Gün '+daysElapsed+'/7':'Day '+daysElapsed+'/7'}</div>
        </div>
        <div style="text-align:right">
          <div class="wk-pnl ${ipPnl>=0?'pos':'neg'}">${ipPnl>=0?'+':''}${fmtCur(ipPnl)}</div>
          <div style="font-size:0.62rem;color:var(--muted)">${fmtP(ipPct)}</div>
        </div>
      </div>
    </div>`;
  }
}

function renderLog(){
  const dates=[...HISTORY.dates].reverse();
  document.getElementById('logHead').innerHTML='<th>'+(LANG==='tr'?'Tarih':'Date')+'</th>'+INSTRS.map(i=>`<th>${i.id.toUpperCase()}</th>`).join('')+'<th>'+(LANG==='tr'?'Toplam':'Total')+'</th><th>K/Z</th>';
  document.getElementById('logBody').innerHTML=dates.map(date=>{
    const di=HISTORY.dates.indexOf(date);let total=0;
    const cells=INSTRS.map(ins=>{const p=HISTORY[ins.id]?.[di];if(p===undefined){total+=ins.alloc;return'<td style="color:var(--muted)">--</td>';}const v=ins.id==='dep'?p:(ins.alloc/ins.buyPrice)*p;total+=v;const prev=di>0?HISTORY[ins.id]?.[di-1]:p;const dp=prev?((p-prev)/prev*100):0;const cls=dp>=0?'pos':'neg';const dec=ins.id==='btc'?0:ins.id==='dep'?0:ins.id==='gold'?0:2;return`<td class="${cls}">${fmt(p,dec)}</td>`;}).join('');
    const kz=total-CAPITAL;return`<tr><td>${date.slice(5).replace('-','/')}</td>${cells}<td class="neutral">${fmtCur(total)}</td><td class="${kz>=0?'pos':'neg'}">${kz>=0?'+':''}${fmtCur(kz)}</td></tr>`;
  }).join('');
}

function renderESG(){
  const colors={e:'#34d399',s:'#60a5fa',g:'#a78bfa'};
  let html='';
  INSTRS.forEach(i=>{if(!i.esg)return;html+=`<div style="margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--border)"><div style="font-weight:600;color:${i.color};margin-bottom:3px">${SN(i)} <span style="color:var(--muted);font-weight:400">(%${i.w})</span></div>`;
    ['e','s','g'].forEach(k=>{html+=`<div class="esg-row-mini"><span class="esg-label">${t('esg'+k.toUpperCase())}</span><div class="esg-bar-mini"><div class="esg-fill-mini" style="width:${i.esg[k]*20}%;background:${colors[k]}"></div></div><span style="font-weight:600;color:${colors[k]};font-size:0.62rem">${i.esg[k]}/5</span></div>`;});
    html+='</div>';});
  const aE=INSTRS.reduce((s,i)=>s+(i.esg?.e||0)*i.w/100,0),aS=INSTRS.reduce((s,i)=>s+(i.esg?.s||0)*i.w/100,0),aG=INSTRS.reduce((s,i)=>s+(i.esg?.g||0)*i.w/100,0);
  html+=`<div style="margin-top:6px;padding:6px 8px;background:var(--surface2);border-radius:4px;font-size:0.64rem"><div style="color:var(--muted);margin-bottom:2px">${t('esgAvg')}</div><span style="color:${colors.e};font-weight:600">E: ${aE.toFixed(1)}</span> · <span style="color:${colors.s};font-weight:600">S: ${aS.toFixed(1)}</span> · <span style="color:${colors.g};font-weight:600">G: ${aG.toFixed(1)}</span></div>`;
  document.getElementById('esgPanel').innerHTML=html;
  const ex=document.getElementById('esgExplain');
  if(ex) ex.innerHTML=LANG==='tr'
    ?'<strong>ESG Nedir?</strong> Cevresel (E), Sosyal (S) ve Yonetimsel (G) kriterlere gore surdurulebilirlik degerlendirmesidir. 1-5 arasi puanlama yapilir.<br><strong>E (Cevre):</strong> Karbon ayak izi, enerji verimliligi, atik yonetimi.<br><strong>S (Sosyal):</strong> Calisan haklari, toplumsal etki, tuketici guvenligi.<br><strong>G (Yonetim):</strong> Yonetim kurulu yapisi, seffaflik, etik uyum.'
    :'<strong>What is ESG?</strong> A sustainability assessment based on Environmental (E), Social (S) and Governance (G) criteria. Scored 1-5.<br><strong>E:</strong> Carbon footprint, energy efficiency, waste management.<br><strong>S:</strong> Labor rights, community impact, consumer safety.<br><strong>G:</strong> Board structure, transparency, ethical compliance.';
}

function switchChartTab(el,tab){
  curChartTab=tab;
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  // Smooth fade transition
  const wrap=document.querySelector('.chart-wrap');
  wrap.classList.add('chart-fading');
  setTimeout(()=>{renderChart();wrap.classList.remove('chart-fading');},250);
}

// Donut legend hover helpers
// Old donutHover/Unhover removed — replaced by donutSliceHover/donutSliceLeave in renderDonut

// ════════════════════════════════════════════════════════════════
// DARK MODE TOGGLE
// ════════════════════════════════════════════════════════════════
let darkMode = false;
function toggleTheme(){
  darkMode = !darkMode;
  document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : '');
  var icon = document.getElementById('themeIcon');
  if(icon){
    icon.innerHTML = darkMode
      ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
      : '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
  }
  // Re-render charts (they need new colors)
  if(mainChart) renderChart();
  renderDonut();
}

// ════════════════════════════════════════════════════════════════
// MARKET STATUS INDICATORS
// ════════════════════════════════════════════════════════════════
function updateMarketStatus(){
  const now = new Date();
  const h = now.getHours(), d = now.getDay();
  const bistOpen = d>=1 && d<=5 && h>=10 && h<18;
  const goldOpen = d>=1 && d<=5 && h>=10 && h<18;
  document.getElementById('mktBist').className = 'mkt-dot ' + (bistOpen?'open':'closed');
  document.getElementById('mktCrypto').className = 'mkt-dot open'; // 7/24
  document.getElementById('mktGold').className = 'mkt-dot ' + (goldOpen?'open':'closed');
}

// ════════════════════════════════════════════════════════════════
// RISK METRICS — calculated from HISTORY (real data only)
// ════════════════════════════════════════════════════════════════
function renderRisk(){
  const el = document.getElementById('riskGrid');
  if(!el) return;
  const dates = HISTORY.dates;
  if(dates.length < 3){ el.innerHTML=''; return; }

  // Daily portfolio returns
  const portfolioVals = dates.map((_,di) => {
    let total=0;
    INSTRS.forEach(ins => {
      const p = HISTORY[ins.id]?.[di];
      if(p===undefined){ total+=ins.alloc; return; }
      total += ins.id==='dep' ? p : (ins.alloc/ins.buyPrice)*p;
    });
    return total;
  });

  const dailyReturns = [];
  for(let i=1;i<portfolioVals.length;i++){
    dailyReturns.push((portfolioVals[i]-portfolioVals[i-1])/portfolioVals[i-1]);
  }

  // Volatility (annualized)
  const mean = dailyReturns.reduce((a,b)=>a+b,0)/dailyReturns.length;
  const variance = dailyReturns.reduce((s,r)=>s+Math.pow(r-mean,2),0)/(dailyReturns.length-1);
  const dailyVol = Math.sqrt(variance);
  const annualVol = dailyVol * Math.sqrt(252) * 100;

  // Max Drawdown
  let peak = portfolioVals[0], maxDD = 0;
  portfolioVals.forEach(v => {
    if(v > peak) peak = v;
    const dd = (peak - v) / peak;
    if(dd > maxDD) maxDD = dd;
  });

  // Sharpe Ratio (assuming risk-free ~%35 annual → ~0.139% daily)
  const rfDaily = 0.35/252;
  const excessMean = mean - rfDaily;
  const sharpe = dailyVol > 0 ? (excessMean / dailyVol) * Math.sqrt(252) : 0;

  const nDays = dailyReturns.length;
  const methodNote = LANG==='tr'
    ? `Günlük portföy getirilerinden hesaplandı (${nDays} gün). Risksiz faiz: TCMB %35.`
    : `Calculated from daily portfolio returns (${nDays} days). Risk-free rate: CBRT 35%.`;

  const volExplain = LANG==='tr'
    ? (annualVol<15?'Dusuk risk: portfoy dengeli dagilmis':'Orta-yuksek: bazi varliklar dalgali')
    : (annualVol<15?'Low risk: portfolio well-balanced':'Medium-high: some volatile assets');
  const ddExplain = LANG==='tr'
    ? (maxDD<0.02?'Cok az dusus: saglam portfoy':'Dikkate deger dusus: izlenmeli')
    : (maxDD<0.02?'Very low drawdown: solid portfolio':'Notable drawdown: monitor closely');
  const shExplain = LANG==='tr'
    ? (sharpe>0?'Pozitif: risksiz faizin ustunde getiri':'Negatif: risksiz faiz daha karli olurdu')
    : (sharpe>0?'Positive: earning above risk-free rate':'Negative: risk-free rate would earn more');

  el.innerHTML = `
    <div class="risk-card"><div class="risk-label">${t('volatility')}</div><div class="risk-value">${annualVol.toFixed(1)}%</div><div class="risk-sub">${LANG==='tr'?'Yillik (s x v252)':'Annualized'}</div><div style="font-size:0.50rem;color:var(--muted);margin-top:4px;line-height:1.4;border-top:1px solid var(--border);padding-top:4px">${LANG==='tr'?'Portfoyun yillik dalgalanma orani. Dusuk = daha az risk.':'Annual fluctuation rate. Lower = less risk.'}<br><em>${volExplain}</em></div></div>
    <div class="risk-card"><div class="risk-label">${t('maxDrawdown')}</div><div class="risk-value neg">-${(maxDD*100).toFixed(2)}%</div><div class="risk-sub">${LANG==='tr'?'Zirve - Dip':'Peak - Trough'}</div><div style="font-size:0.50rem;color:var(--muted);margin-top:4px;line-height:1.4;border-top:1px solid var(--border);padding-top:4px">${LANG==='tr'?'En yuksek noktadan en derin dusus. Kucuk = daha saglam.':'Deepest drop from peak. Smaller = more stable.'}<br><em>${ddExplain}</em></div></div>
    <div class="risk-card"><div class="risk-label">${t('sharpe')}</div><div class="risk-value ${sharpe>=0?'pos':'neg'}">${sharpe.toFixed(2)}</div><div class="risk-sub">${LANG==='tr'?'Risksiz: %35/yil':'Risk-free: 35%/yr'}</div><div style="font-size:0.50rem;color:var(--muted);margin-top:4px;line-height:1.4;border-top:1px solid var(--border);padding-top:4px">${LANG==='tr'?'Aldiginiz risk basina kazanc. >0 iyi, >1 mukemmel.':'Return per unit risk. >0 good, >1 excellent.'}<br><em>${shExplain}</em></div></div>
  `;
  el.innerHTML += `<div style="grid-column:1/-1;font-size:0.56rem;color:var(--muted);margin-top:-4px;padding:0 2px">${methodNote}</div>`;
}

// ════════════════════════════════════════════════════════════════
// CORRELATION MATRIX — from HISTORY (real data)
// ════════════════════════════════════════════════════════════════
function renderCorrelation(){
  const el = document.getElementById('corrMatrix');
  if(!el) return;
  const dates = HISTORY.dates;
  if(dates.length < 4){ el.innerHTML=''; return; }

  // Get daily returns for each instrument
  const ids = INSTRS.filter(i=>i.id!=='dep').map(i=>i.id);
  const names = INSTRS.filter(i=>i.id!=='dep').map(i=>SN(i).substring(0,5));
  const returns = {};
  ids.forEach(id => {
    returns[id] = [];
    for(let i=1;i<dates.length;i++){
      const prev = HISTORY[id]?.[i-1], cur = HISTORY[id]?.[i];
      if(prev && cur && prev>0) returns[id].push((cur-prev)/prev);
      else returns[id].push(0);
    }
  });

  function corr(a, b){
    const n = a.length;
    if(n<2) return 0;
    const ma = a.reduce((s,v)=>s+v,0)/n, mb = b.reduce((s,v)=>s+v,0)/n;
    let num=0, da=0, db=0;
    for(let i=0;i<n;i++){
      const x=a[i]-ma, y=b[i]-mb;
      num+=x*y; da+=x*x; db+=y*y;
    }
    return (da>0&&db>0) ? num/Math.sqrt(da*db) : 0;
  }

  function corrColor(v){
    if(v>=0.7) return 'rgba(26,71,42,0.8)';
    if(v>=0.3) return 'rgba(26,71,42,0.4)';
    if(v>=-0.3) return 'rgba(138,128,112,0.2)';
    if(v>=-0.7) return 'rgba(192,57,43,0.4)';
    return 'rgba(192,57,43,0.8)';
  }

    const nDays = dates.length - 1;
  const fullNames = INSTRS.filter(i=>i.id!=='dep').map(i=>SN(i));

  const n = ids.length;
  let html = `<div class="corr-layout"><div class="corr-left"><div class="corr-grid" style="grid-template-columns:32px repeat(${n},1fr)">`;
  html += `<div></div>`;
  ids.forEach((_,i) => { html += `<div class="corr-label">${names[i]}</div>`; });
  ids.forEach((id1,i) => {
    html += `<div class="corr-label">${names[i]}</div>`;
    ids.forEach((id2,j) => {
      const c = i===j ? 1 : corr(returns[id1], returns[id2]);
      const textCol = Math.abs(c)>0.5 ? '#fff' : 'var(--text)';
      html += `<div class="corr-cell" style="background:${corrColor(c)};color:${textCol}" onmouseenter="showCorrPair(event,'${id1}','${id2}',${i},${j})" onmouseleave="hideCorrPair()">${c.toFixed(2)}</div>`;
    });
  });
  html += '</div>';

  // Methodology note + legend below matrix
  const methodNote = LANG==='tr'
    ? `Pearson korelasyonu · Günlük fiyat getirileri · ${nDays} gün · Mevduat hariç`
    : `Pearson correlation · Daily price returns · ${nDays} days · Excl. deposit`;
  html += `<div style="font-size:0.50rem;color:var(--muted);margin-top:4px;line-height:1.4">${methodNote}</div>`;

  // Legend
  const legendItems = LANG==='tr'
    ? [{c:'rgba(26,71,42,0.8)',l:'Güçlü +'},{c:'rgba(26,71,42,0.4)',l:'Zayıf +'},{c:'rgba(138,128,112,0.2)',l:'Nötr'},{c:'rgba(192,57,43,0.4)',l:'Zayıf −'},{c:'rgba(192,57,43,0.8)',l:'Güçlü −'}]
    : [{c:'rgba(26,71,42,0.8)',l:'Strong +'},{c:'rgba(26,71,42,0.4)',l:'Weak +'},{c:'rgba(138,128,112,0.2)',l:'Neutral'},{c:'rgba(192,57,43,0.4)',l:'Weak −'},{c:'rgba(192,57,43,0.8)',l:'Strong −'}];
  html += `<div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap">${legendItems.map(li=>`<div style="display:flex;align-items:center;gap:3px;font-size:0.50rem;color:var(--muted)"><div style="width:8px;height:8px;border-radius:2px;background:${li.c}"></div>${li.l}</div>`).join('')}</div>`;

  // Close corr-left, add corr-right tooltip panel
  html += '</div><div class="corr-right" id="corrTooltip"><div style="font-size:0.5rem;color:var(--muted);text-align:center;padding:20px 0">'+(LANG==='tr'?'Hucrenin ustune gelin':'Hover over a cell')+'</div></div></div>';

  el.innerHTML = html;
}

// ════════════════════════════════════════════════════════════════
// CONFETTI — ATH celebration
// ════════════════════════════════════════════════════════════════
let prevATH = 0;
function checkATH(){
  let total=0;
  INSTRS.forEach(i=>{total+=currVal(i);});
  // Check against HISTORY max
  const histMax = Math.max(...HISTORY.dates.map((_,di)=>{
    let t=0;INSTRS.forEach(ins=>{const p=HISTORY[ins.id]?.[di];if(p===undefined){t+=ins.alloc;return;}t+=ins.id==='dep'?p:(ins.alloc/ins.buyPrice)*p;});return t;
  }));
  if(total > histMax && total > prevATH && prevATH > 0){
    fireConfetti();
    showToast(t('athCelebration') + ' ' + fmtCur(total));
  }
  prevATH = total;
}

function fireConfetti(){
  const canvas = document.getElementById('confettiCanvas');
  if(!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const particles = [];
  const colors = ['#c9a84c','#4ade80','#e67e22','#6d28d9','#c0392b','#1d4ed8','#059669'];

  for(let i=0;i<120;i++){
    particles.push({
      x: Math.random()*canvas.width,
      y: -20 - Math.random()*200,
      w: 4+Math.random()*6, h: 4+Math.random()*6,
      vx: (Math.random()-0.5)*4,
      vy: 2+Math.random()*4,
      rot: Math.random()*360,
      rotV: (Math.random()-0.5)*8,
      color: colors[Math.floor(Math.random()*colors.length)],
      life: 1
    });
  }

  let frame = 0;
  function animate(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    let alive = false;
    particles.forEach(p=>{
      if(p.life<=0) return;
      alive = true;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.rot += p.rotV;
      p.life -= 0.005;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI/180);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
    });
    frame++;
    if(alive && frame < 300) requestAnimationFrame(animate);
    else ctx.clearRect(0,0,canvas.width,canvas.height);
  }
  animate();
}

// ════════════════════════════════════════════════════════════════
// SCROLL REVEAL (IntersectionObserver)
// ════════════════════════════════════════════════════════════════
function initScrollReveal(){
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ════════════════════════════════════════════════════════════════
// COUNT-UP ANIMATION
// ════════════════════════════════════════════════════════════════
function animateCountUp(el, targetVal, prefix='', suffix='', decimals=0, duration=600){
  const startVal = parseFloat(el.dataset.lastVal || '0');
  el.dataset.lastVal = targetVal;
  const startTime = performance.now();
  function step(now){
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = startVal + (targetVal - startVal) * eased;
    el.textContent = prefix + fmt(current, decimals) + suffix;
    if(progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ════════════════════════════════════════════════════════════════
// STAGGERED TABLE ROW ANIMATION
// ════════════════════════════════════════════════════════════════
function staggerRows(){
  // Stagger is now CSS-only via cascade, kept for compat
}

// ════════════════════════════════════════════════════════════════
// BUTTON RIPPLE EFFECT
// ════════════════════════════════════════════════════════════════
document.addEventListener('click', function(e){
  const btn = e.target.closest('.btn');
  if(!btn) return;
  const wave = document.createElement('span');
  wave.className = 'ripple-wave';
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  wave.style.width = wave.style.height = size + 'px';
  wave.style.left = (e.clientX - rect.left - size/2) + 'px';
  wave.style.top = (e.clientY - rect.top - size/2) + 'px';
  btn.appendChild(wave);
  setTimeout(() => wave.remove(), 600);
});

// ════════════════════════════════════════════════════════════════
// PRICE FLASH EFFECT — on table rows after fetch
// ════════════════════════════════════════════════════════════════
let prevPrices = {};
let priceChanges = {}; // +1 = up, -1 = down, 0 = same

function savePricesForFlash(){
  priceChanges = {};
  INSTRS.forEach(ins => {
    const p = getLatestPrice(ins.id);
    const prev = prevPrices[ins.id];
    if(prev !== undefined && prev !== p){
      priceChanges[ins.id] = p > prev ? 1 : -1;
    }
    prevPrices[ins.id] = p;
  });
}

function applyFlashEffects(){
  // Small delay to ensure DOM is painted
  requestAnimationFrame(() => {
    const rows = document.querySelectorAll('.instr-table tbody tr');
    INSTRS.forEach((ins, idx) => {
      const change = priceChanges[ins.id];
      if(change && rows[idx]){
        const cls = change > 0 ? 'flash-green' : 'flash-red';
        rows[idx].classList.add(cls);
        setTimeout(() => rows[idx].classList.remove(cls), 900);
      }
    });
  });
}

// ════════════════════════════════════════════════════════════════
// AUTO-REFRESH COUNTDOWN
// ════════════════════════════════════════════════════════════════
function startCountdown(){
  setInterval(()=>{
    countdownSec--;
    if(countdownSec<=0){countdownSec=900;fetchAllPrices();}
    const min=Math.floor(countdownSec/60),sec=countdownSec%60;
    document.getElementById('countdown').textContent=`${t('nextUpdate')}: ${min}:${sec.toString().padStart(2,'0')}`;
  },1000);
}

// ════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════
// SCROLL PROGRESS BAR
// ════════════════════════════════════════════════════════════════
window.addEventListener('scroll',()=>{
  const h = document.documentElement;
  const pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
  document.getElementById('scrollProgress').style.width = Math.min(pct,100)+'%';
});

// ════════════════════════════════════════════════════════════════
// LIVE CLOCK + MARKET COUNTDOWN
// ════════════════════════════════════════════════════════════════
function updateClock(){
  const now = new Date();
  const hh = String(now.getHours()).padStart(2,'0');
  const mm = String(now.getMinutes()).padStart(2,'0');
  const ss = String(now.getSeconds()).padStart(2,'0');
  const el = document.getElementById('lastUpd');
  if(el) el.textContent = hh+':'+mm+':'+ss;
}

// ════════════════════════════════════════════════════════════════
// INSTRUMENT DETAIL PANEL
// ════════════════════════════════════════════════════════════════
function openDetail(insId){
  const ins = INSTRS.find(i=>i.id===insId);
  if(!ins) return;
  const cv = currVal(ins), pl = pnlVal(ins), pp = pnlPct(ins);
  const price = getLatestPrice(ins.id);
  const qty = getQty(ins);

  let html = `<div class="detail-title" style="color:${ins.color}">${L(ins.name)}</div>`;
  html += `<div style="font-size:0.62rem;color:var(--muted);margin-bottom:16px">${ins.ticker} · ${L(ins.desc)}</div>`;

  const stats = [
    [LANG==='tr'?'Guncel Fiyat':'Price', ins.id==='dep'?fmtCur(cv):(LANG==='en'?'$'+fmt(toUsd(price),2):fmt(price,2)+' TL')],
    [LANG==='tr'?'Adet':'Qty', qty?fmt(qty,ins.id==='btc'?6:2):'--'],
    [LANG==='tr'?'Yatirim':'Invested', fmtCur(ins.alloc)],
    [LANG==='tr'?'Deger':'Value', fmtCur(cv)],
    [LANG==='tr'?'Kar/Zarar':'P/L', `<span class="${pl>=0?'pos':'neg'}">${pl>=0?'+':''}${fmtCur(pl)} (${fmtP(pp)})</span>`],
    [LANG==='tr'?'Agirlik':'Weight', `%${ins.w}`],
    ['ESG', `E:${ins.esg.e} S:${ins.esg.s} G:${ins.esg.g}`],
  ];
  stats.forEach(([l,v])=>{html+=`<div class="detail-stat"><span class="ds-label">${l}</span><span class="ds-val">${v}</span></div>`;});

  // Mini price history
  html += `<div style="margin-top:16px"><div style="font-size:0.60rem;color:var(--muted);margin-bottom:6px">${LANG==='tr'?'Fiyat Gecmisi':'Price History'}</div>`;
  html += `<canvas id="detailMiniChart" height="100"></canvas></div>`;

  document.getElementById('detailContent').innerHTML = html;
  document.getElementById('detailOverlay').classList.add('open');

  // Draw mini chart
  setTimeout(()=>{
    const ctx = document.getElementById('detailMiniChart');
    if(!ctx) return;
    const dates = HISTORY.dates;
    const data = dates.map((_,di)=> HISTORY[ins.id]?.[di] || 0);
    new Chart(ctx,{type:'line',data:{labels:dates.map(d=>d.slice(5)),datasets:[{data,borderColor:ins.color,borderWidth:2,fill:true,backgroundColor:ins.color+'15',tension:0.3,pointRadius:2,pointBackgroundColor:ins.color}]},
      options:{responsive:true,plugins:{legend:{display:false},tooltip:{enabled:true}},scales:{x:{display:false},y:{display:true,ticks:{font:{size:8}}}},animation:{duration:500}}});
  },100);
}

function closeDetail(e){
  if(e && e.target !== e.currentTarget && !e.target.classList.contains('detail-close')) return;
  document.getElementById('detailOverlay').classList.remove('open');
}


// ════════════════════════════════════════════════════════════════
// T-TEST — Full academic statistical analysis with tabs
// ════════════════════════════════════════════════════════════════
let tTestTab='overview';
function switchTTestTab(tab){
  tTestTab=tab;
  document.querySelectorAll('.ttest-tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===tab));
  renderTTestBody();
}
