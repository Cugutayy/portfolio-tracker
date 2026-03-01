function switchPage(page){
  currentPage=page;
  document.querySelectorAll('.page-nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  document.getElementById('pageDashboard').style.display=page==='dashboard'?'':'none';
  document.getElementById('pageTTest').style.display=page==='ttest'?'':'none';
  document.getElementById('pageBeta').style.display=page==='beta'?'':'none';
  document.getElementById('pageAnalytics').style.display=page==='analytics'?'':'none';
  document.getElementById('pageMarkets').style.display=page==='markets'?'':'none';
  document.getElementById('pageSample').style.display=page==='sample'?'':'none';
  // Hide side panel stuff on sub pages
  document.querySelector('.side-overlay')?.classList.remove('open');
  const sideToggle=document.getElementById('sideToggle');
  if(sideToggle) sideToggle.style.display=page==='dashboard'?'':'none';
  if(page==='ttest') renderTTest();
  if(page==='beta') renderBeta();
  if(page==='analytics') renderAnalytics();
  if(page==='markets') renderMarkets();
  if(page==='sample') renderSample();
  window.scrollTo(0,0);
}

// ════════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ════════════════════════════════════════════════════════════════
document.addEventListener('keydown', e => {
  // Don't trigger if typing in an input
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
  if(e.key==='r'||e.key==='R'){e.preventDefault();fetchAllPrices();}
  if(e.key==='e'||e.key==='E'){e.preventDefault();exportCSV();}
  if(e.key==='d'||e.key==='D'){e.preventDefault();toggleTheme();}
  if(e.key==='t'||e.key==='T'){e.preventDefault();switchPage(currentPage==='ttest'?'dashboard':'ttest');}
  if(e.key==='b'||e.key==='B'){e.preventDefault();switchPage(currentPage==='beta'?'dashboard':'beta');}
  if(e.key==='a'||e.key==='A'){e.preventDefault();switchPage(currentPage==='analytics'?'dashboard':'analytics');}
  if(e.key==='m'||e.key==='M'){e.preventDefault();switchPage(currentPage==='markets'?'dashboard':'markets');}
  if(e.key==='p'||e.key==='P'){e.preventDefault();switchPage(currentPage==='sample'?'dashboard':'sample');}
  if(e.key==='1'){const tabs=document.querySelectorAll('.chart-tabs .tab');if(tabs[0])tabs[0].click();}
  if(e.key==='2'){const tabs=document.querySelectorAll('.chart-tabs .tab');if(tabs[1])tabs[1].click();}
  if(e.key==='3'){const tabs=document.querySelectorAll('.chart-tabs .tab');if(tabs[2])tabs[2].click();}
});

// ════════════════════════════════════════════════════════════════
// TOUCH SUPPORT for hover-dependent features
// ════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // Donut slices: tap to show detail
  document.addEventListener('touchstart', e => {
    const slice = e.target.closest('.donut-slice');
    if(slice){
      e.preventDefault();
      const idx = parseInt(slice.dataset.idx);
      if(!isNaN(idx) && window._donutShowDetail) window._donutShowDetail(idx);
    }
    // Corr cells: tap to show pair chart
    const cell = e.target.closest('.corr-cell');
    if(cell){
      const enterEvt = cell.getAttribute('onmouseenter');
      if(enterEvt) eval(enterEvt.replace('event','e'));
    }
  }, {passive:false});
});

async function init(){
  const ov=document.getElementById('loadingOverlay'),st=document.getElementById('ldStatus');
  renderInfoBox();
  st.textContent=LANG==='tr'?'Geçmiş veriler yükleniyor...':'Loading history...';
  await sleep(400);
  st.textContent=LANG==='tr'?'Arayüz oluşturuluyor...':'Building UI...';
  await sleep(300);
  // Inject today into HISTORY even before fetch (using carry-forward)
  injectTodayToHistory();
  renderAll();
  // Initialize ATH from HISTORY
  prevATH = Math.max(...HISTORY.dates.map((_,di)=>{
    let t=0;INSTRS.forEach(ins=>{const p=HISTORY[ins.id]?.[di];if(p===undefined){t+=ins.alloc;return;}t+=ins.id==='dep'?p:(ins.alloc/ins.buyPrice)*p;});return t;
  }));
  st.textContent=LANG==='tr'?'Canlı fiyatlar çekiliyor...':'Fetching live prices...';
  await sleep(200);
  try{await fetchAllPrices();}catch(e){console.warn('Init fetch error:',e);}
  st.textContent=LANG==='tr'?'Hazır!':'Ready!';
  await sleep(250);
  ov.style.opacity='0';
  setTimeout(()=>{ov.style.display='none';initScrollReveal();},400);
  startCountdown();
  // PRE-FETCH market data in background so it's ready when user clicks Piyasalar
  fetchMarketCache().then(ok=>{
    if(ok) console.log('[Init] Market cache pre-loaded');
  }).catch(()=>{});
  // Update market status every minute + bell check
  setInterval(()=>{updateMarketStatus();checkMarketBell();}, 60000);
  checkMarketBell(); // init state
  // Live clock every second
  updateClock();
  setInterval(updateClock, 1000);
  // Daily konfetti check
  setTimeout(checkDailyKonfetti, 2000);
}
init();
