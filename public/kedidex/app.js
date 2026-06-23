/* KediDex — ana uygulama mantığı */
(function () {
  const KD = window.KD;
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  // ---------- durum ----------
  let stream = null;
  let detecting = false;
  let rafId = null;
  let lastResult = null;
  let tracker = null;
  let modelReady = false;
  let myPos = null;          // [lat,lng]
  let gameActive = false;
  let lastRevealCat = null;  // paylaşım için

  // ---------- başlat ----------
  function init() {
    bindNav();
    bindButtons();
    renderProfile();
    initIdentity();
    maybeShowWelcome();
    renderLegend();
    renderCollection();
    askPosition();
    registerSW();
    // model'i arka planda ön-yükle (varsa)
    if (window.cocoSsd) {
      KD.detector.load().then(() => { modelReady = true; setModelStatus('✅ Hazır — kamerayı aç'); })
        .catch(() => setModelStatus('⚠️ Tanıma modeli yüklenemedi (demo kullan)'));
    } else {
      setModelStatus('⚠️ Çevrimdışı — demo modu çalışır');
    }
  }

  // ---------- navigasyon ----------
  function bindNav() {
    $$('.nav-btn').forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));
  }
  function switchView(name) {
    $$('.view').forEach(v => v.classList.remove('active'));
    $('#view-' + name).classList.add('active');
    $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));
    if (name !== 'catch') stopCamera();
    if (name === 'map') KD.mapview.render(KD.storage.loadCollection(), myPos || KD.mapview.DEFAULT, catchSpawn);
    if (name === 'collection') renderCollection();
  }

  // ---------- profil ----------
  function renderProfile() {
    const p = KD.storage.loadProfile();
    $('#lvl').textContent = p.level;
    $('#streak').textContent = p.streak || 0;
    const need = KD.storage.xpForLevel(p.level);
    $('#xpFill').style.width = Math.min(100, (p.xp / need) * 100) + '%';
    $('#xpLabel').textContent = `${p.xp}/${need}`;
  }

  // ---------- avcı kimliği / adı ----------
  let xUser = null;
  function initIdentity() {
    if (!KD.api) return;
    KD.api.playerId(); // oluştur/oku
    renderNick();
    bindXAuth();
    handleXReturn();
    KD.api.xMe().then(applyXIdentity).catch(() => {});
  }
  function renderNick() {
    if (!KD.api) return;
    let n = KD.api.nick();
    if (!n) { n = 'Avcı' + KD.api.playerId().replace(/\D/g, '').slice(-4); KD.api.setNick(n); }
    const el = $('#nickName'); if (el) el.textContent = n;
  }
  function applyXIdentity(me) {
    const xBtn = $('#xBtn');
    if (!me || !me.configured) { if (xBtn) xBtn.classList.add('hidden'); return; }
    if (xBtn) xBtn.classList.remove('hidden');
    if (me.loggedIn && me.username) {
      xUser = me;
      KD.api.setNick('@' + me.username);
      renderNick();
      // X ile girince karşılamayı geç
      localStorage.setItem('kedidex.v1.entered', '1');
      const w = $('#welcome'); if (w) w.classList.add('hidden');
      if (xBtn) { xBtn.textContent = '𝕏 ✓'; xBtn.title = 'X: @' + me.username + ' — çıkış için tıkla'; }
    } else {
      xUser = null;
      if (xBtn) { xBtn.textContent = '𝕏 Giriş'; xBtn.title = 'X (Twitter) ile giriş yap'; }
    }
  }
  function bindXAuth() {
    const xBtn = $('#xBtn');
    if (!xBtn) return;
    xBtn.addEventListener('click', () => {
      if (xUser) { if (confirm('@' + xUser.username + ' hesabından çıkış yapılsın mı?')) location.href = '/api/x/logout'; }
      else location.href = '/api/x/login';
    });
  }
  function handleXReturn() {
    const p = new URLSearchParams(location.search);
    if (p.get('x') === '1') toast('𝕏 ile giriş yapıldı! 🎉');
    else if (p.get('x_err')) toast('X girişi tamamlanamadı (' + p.get('x_err') + ')');
    if (p.has('x') || p.has('x_err')) history.replaceState(null, '', location.pathname);
  }
  function editNick() {
    if (!KD.api) return;
    if (xUser) { toast('Adın X hesabın: @' + xUser.username + '. Değiştirmek için 𝕏 ile çıkış yap.'); return; }
    const cur = KD.api.nick();
    const v = window.prompt('Avcı adın (haritada diğer oyunculara görünür):', cur);
    if (v != null && v.trim()) { KD.api.setNick(v.trim()); renderNick(); }
  }

  // ---------- karşılama / giriş ----------
  function maybeShowWelcome() {
    if (localStorage.getItem('kedidex.v1.entered')) return; // daha önce girdi
    showWelcome();
  }
  function showWelcome() {
    const w = $('#welcome'); if (!w) return;
    try {
      const sample = { seed: 777, rarity: 'myth', look: { coat: { n: 'Pamuk', body: '#f1e7d2', belly: '#fffaf0', stripe: '#ddccac' }, eye: '#4a86c5', eye2: '#e0a83b', pattern: 'duz', blush: true } };
      $('#welcomeCat').innerHTML = KD.catgen.catSVG(sample, 150);
    } catch (e) {}
    w.classList.remove('hidden');
  }
  function enterApp(nick) {
    if (nick && nick.trim() && KD.api) { KD.api.setNick(nick.trim()); renderNick(); }
    localStorage.setItem('kedidex.v1.entered', '1');
    const w = $('#welcome'); if (w) w.classList.add('hidden');
  }

  // ---------- nadirlik lejantı ----------
  function renderLegend() {
    $('#rarityLegend').innerHTML = KD.catgen.RARITIES.map(r =>
      `<span class="leg"><span class="dot" style="background:${r.color}"></span>${r.name}</span>`).join('');
  }

  // ---------- ilerleme (dex + görevler + rozetler) ----------
  function renderProgress() {
    const dex = KD.storage.computeDex();
    $('#dexProgress').innerHTML =
      `<div class="dex-top"><span>📖 KediDex Keşif</span><span>${dex.discovered}/${dex.total} • %${dex.pct}</span></div>
       <div class="bar"><i style="width:${dex.pct}%"></i></div>`;

    const q = KD.storage.ensureDailyQuests();
    $('#questPanel').innerHTML = '<h3>🎯 Günün Görevleri</h3>' + q.items.map(it => {
      const cur = Math.min(it.prog, it.goal);
      const pct = Math.round((cur / it.goal) * 100);
      return `<div class="quest ${it.done ? 'done' : ''}">
        <span class="q-desc">${it.desc}</span>
        <span class="q-rew">+${it.reward} XP</span>
        <div class="q-bar"><i style="width:${pct}%"></i></div>
        <span style="grid-column:1/-1;font-size:11px;color:var(--ink-soft);font-weight:700">${cur}/${it.goal}</span>
      </div>`;
    }).join('');

    $('#badgeRow').innerHTML = KD.storage.computeBadges().map(b =>
      `<div class="badge ${b.earned ? 'earned' : ''}" title="${b.name}">
        <span class="b-emoji">${b.emoji}</span><span class="b-name">${b.name}</span>
      </div>`).join('');
  }

  // ---------- toast bildirimi ----------
  let toastTimer = null;
  function toast(msg) {
    const el = $('#toast');
    el.classList.remove('hidden');
    el.textContent = msg;
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.classList.add('hidden'), 300);
    }, 2600);
  }

  // ---------- koleksiyon ----------
  function renderCollection() {
    const list = KD.storage.loadCollection();
    $('#dexCount').textContent = list.length;
    renderProgress();
    const grid = $('#grid'), empty = $('#empty');
    if (!list.length) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    grid.innerHTML = list.map(cat => cardHTML(cat)).join('');
    $$('#grid .card').forEach(el => el.addEventListener('click', () => openDetail(el.dataset.id)));
  }
  function cardHTML(cat) {
    return `<div class="card r-${cat.rarity}" data-id="${cat.id}">
      <div class="rar-strip" style="background:${cat.rarityColor}"></div>
      ${cat.breed ? `<div class="breed-ribbon">🇹🇷 ${cat.breedName}</div>` : ''}
      ${KD.catgen.catSVG(cat, 160).replace('<svg', '<svg class="cat-svg"')}
      <div class="cat-name">${cat.name}</div>
      <div class="cat-title">${cat.title}</div>
      <div class="cat-foot">
        <span class="rar-badge" style="background:${cat.rarityColor}">${cat.rarityName}</span>
        <span class="lvl-badge">Lv.${cat.level}</span>
      </div>
    </div>`;
  }

  // ---------- detay ----------
  function openDetail(id) {
    const cat = KD.storage.getById(id);
    if (!cat) return;
    const statsHTML = KD.catgen.STATKEYS.map(s => {
      const v = cat.stats[s.k] || 0;
      return `<div class="stat"><span>${s.n}</span><div class="bar"><i style="width:${v}%"></i></div><span>${v}</span></div>`;
    }).join('');
    const d = new Date(cat.caughtAt);
    $('#detailBody').innerHTML = `
      <div class="detail-card">
        <div id="detailFig" class="cat-svg detail-fig"></div>
        <div class="detail-head">
          <h2>${cat.name}</h2>
          <div class="sub">${cat.title} • Lv.${cat.level}</div>
          ${cat.breed ? `<div class="sub" style="color:var(--accent);font-weight:800">🇹🇷 ${cat.breedName}</div>` : ''}
          <span class="rar-badge" style="background:${cat.rarityColor}">${cat.rarityName}</span>
        </div>
      </div>
      <div class="stats">${statsHTML}</div>
      <div id="detailPhoto" class="detail-photo"></div>
      <div class="story">📖 ${cat.story}</div>
      <div class="meta-row">
        <span>Yakalama kalitesi: ${cat.quality}%</span>
        <span>${d.toLocaleDateString('tr-TR')} ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <button id="detailShare" class="btn btn-share detail-actions">📤 Kartı Paylaş</button>`;
    if (cat.hasPhoto && KD.photos) {
      KD.photos.get(cat.id).then(url => {
        const el = $('#detailPhoto');
        if (url && el) el.innerHTML = `<div class="dp-label">📷 Yakaladığın gerçek kedi</div><img src="${url}" alt="gerçek kedi">`;
      });
    }
    // 3B döner figür (yüklenmezse SVG'ye düş)
    const figEl = $('#detailFig');
    const mounted = KD.figurine && KD.figurine.mount(figEl, cat);
    if (!mounted) figEl.innerHTML = KD.catgen.catSVG(cat, 120).replace('<svg', '<svg class="cat-svg"');
    $('#detailShare').addEventListener('click', () => KD.share.shareCat(cat, KD.api && KD.api.nick()));
    $('#detail').classList.remove('hidden');
  }

  // ---------- konum ----------
  function askPosition() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => { myPos = [pos.coords.latitude, pos.coords.longitude]; },
      () => { myPos = null; },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }

  // ---------- kamera + tanıma ----------
  function setModelStatus(t) { $('#modelStatus').textContent = t; }
  function setDetStatus(t, cls) {
    const el = $('#detStatus');
    el.textContent = t; el.className = 'det-status ' + cls;
  }

  async function startCamera() {
    if (stream) return;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      const v = $('#video');
      v.srcObject = stream;
      await v.play();
      $('#startBtn').classList.add('hidden');
      tracker = KD.detector.makeTracker();
      if (!modelReady) {
        setModelStatus('🧠 Tanıma modeli yükleniyor…');
        await KD.detector.load();
        modelReady = true;
      }
      setModelStatus('🔎 Kediyi çerçeveye al');
      detecting = true;
      loop();
    } catch (e) {
      setModelStatus('⚠️ Kameraya erişilemedi — “Demo” ile dene');
    }
  }

  function stopCamera() {
    detecting = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    const v = $('#video'); if (v) v.srcObject = null;
    $('#startBtn').classList.remove('hidden');
    $('#catchBtn').classList.add('hidden');
    $('#game').classList.add('hidden');
    clearOverlay();
  }

  let frameCount = 0;
  async function loop() {
    if (!detecting) return;
    const v = $('#video');
    frameCount++;
    // her ~5 karede bir ağır tanıma çağır
    if (!gameActive && v.readyState >= 2 && frameCount % 5 === 0) {
      try {
        const preds = await KD.detector.detect(v);
        lastResult = tracker.push(preds, v);
        applyDetState(lastResult);
      } catch (e) {}
    }
    drawOverlay();
    rafId = requestAnimationFrame(loop);
  }

  function applyDetState(r) {
    if (gameActive) return;
    if (r.state === 'searching') {
      setDetStatus('Kedi aranıyor…', 'searching');
      $('#catchBtn').classList.add('hidden');
    } else if (r.state === 'found') {
      const live = r.live ? '' : ' (sabit tut, biraz oynat)';
      setDetStatus('Kedi bulundu! ' + Math.round(r.progress * 100) + '%' + live, 'found');
      $('#catchBtn').classList.add('hidden');
    } else if (r.state === 'ready') {
      setDetStatus('YAKALAMAYA HAZIR! 🎯', 'ready');
      $('#catchBtn').classList.remove('hidden');
    }
  }

  function drawOverlay() {
    const v = $('#video'), c = $('#overlay');
    if (!c) return;
    const w = c.clientWidth, h = c.clientHeight;
    if (c.width !== w) c.width = w; if (c.height !== h) c.height = h;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    if (lastResult && lastResult.box && v.videoWidth) {
      const sx = w / v.videoWidth, sy = h / v.videoHeight;
      const [x, y, bw, bh] = lastResult.box;
      ctx.lineWidth = 5;
      ctx.strokeStyle = lastResult.state === 'ready' ? '#5aa86a' : '#f2b134';
      ctx.setLineDash(lastResult.state === 'ready' ? [] : [10, 8]);
      roundRect(ctx, x * sx, y * sy, bw * sx, bh * sy, 16);
      ctx.stroke();
    }
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function clearOverlay() {
    const c = $('#overlay'); if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height);
  }

  // ---------- yakalama mini-oyunu (zamanlama) ----------
  let gameRaf = null, gameStart = 0;
  const TARGET = 120, RING_MAX = 300, RING_MIN = 60, PERIOD = 1100;

  function startGame(onResult) {
    if (gameActive) return;            // tekrar girişi engelle (çift yakalama önlemi)
    gameActive = true;
    if (KD.sound) KD.sound.play('catchStart');
    const g = $('#game'); g.classList.remove('hidden');
    $('#catchBtn').classList.add('hidden');
    setDetStatus('Tam zamanında dokun!', 'ready');
    gameStart = performance.now();
    let tapped = false;

    const ring = $('#gameRing');
    function frame(now) {
      const t = ((now - gameStart) % PERIOD) / PERIOD;     // 0..1
      const tri = t < 0.5 ? t * 2 : (1 - t) * 2;            // üçgen dalga 0..1..0
      const size = RING_MAX - (RING_MAX - RING_MIN) * tri;
      ring.style.width = ring.style.height = size + 'px';
      ring.dataset.size = size;
      gameRaf = requestAnimationFrame(frame);
    }
    gameRaf = requestAnimationFrame(frame);

    function onTap() {
      if (tapped) return; tapped = true;
      cancelAnimationFrame(gameRaf);
      g.removeEventListener('pointerdown', onTap);
      const size = parseFloat(ring.dataset.size || RING_MAX);
      const diff = Math.abs(size - TARGET);
      const quality = Math.max(0.05, 1 - diff / 150);
      if (KD.sound) KD.sound.play('snap');
      screenFlash('#ffffff');
      g.classList.add('hidden');
      gameActive = false;
      setTimeout(() => onResult(quality), 200);
    }
    g.addEventListener('pointerdown', onTap);

    // 4 sn içinde dokunmazsa otomatik düşük kalite
    setTimeout(() => { if (!tapped) onTap(); }, 4000);
  }

  // video karesini küçük JPEG olarak al (sunucu doğrulaması + saklama için)
  function grabFrame() {
    const v = $('#video');
    if (!v || !v.videoWidth) return null;
    const w = 320, h = Math.round(320 * v.videoHeight / v.videoWidth) || 240;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    cv.getContext('2d').drawImage(v, 0, 0, w, h);
    try { return cv.toDataURL('image/jpeg', 0.7); } catch (e) { return null; }
  }

  // kedinin gerçek tüy rengini örnekle (kart ona benzesin)
  function sampleVideoColor() {
    const v = $('#video');
    if (!v || !v.videoWidth) return null;
    const cv = document.createElement('canvas'); cv.width = 32; cv.height = 32;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    let sx = v.videoWidth * 0.25, sy = v.videoHeight * 0.25, sw = v.videoWidth * 0.5, sh = v.videoHeight * 0.5;
    if (lastResult && lastResult.box) { const b = lastResult.box; sx = b[0]; sy = b[1]; sw = b[2]; sh = b[3]; }
    try { ctx.drawImage(v, sx, sy, sw, sh, 0, 0, 32, 32); } catch (e) { return null; }
    const d = ctx.getImageData(0, 0, 32, 32).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    return { r: r / n, g: g / n, b: b / n };
  }

  // algısal parmak izi (8x8 aHash) — aynı kediyi tekrar yakalamayı engellemek için
  function computeHash() {
    const v = $('#video');
    if (!v || !v.videoWidth) return null;
    const cv = document.createElement('canvas'); cv.width = 8; cv.height = 8;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    let sx = v.videoWidth * 0.2, sy = v.videoHeight * 0.2, sw = v.videoWidth * 0.6, sh = v.videoHeight * 0.6;
    if (lastResult && lastResult.box) { const b = lastResult.box; sx = b[0]; sy = b[1]; sw = b[2]; sh = b[3]; }
    try { ctx.drawImage(v, sx, sy, sw, sh, 0, 0, 8, 8); } catch (e) { return null; }
    const d = ctx.getImageData(0, 0, 8, 8).data;
    const g = []; let sum = 0;
    for (let i = 0; i < d.length; i += 4) { const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; g.push(y); sum += y; }
    const avg = sum / g.length;
    let hex = '';
    for (let i = 0; i < 64; i += 4) {
      let nib = 0;
      for (let j = 0; j < 4; j++) nib = (nib << 1) | (g[i + j] > avg ? 1 : 0);
      hex += nib.toString(16);
    }
    return hex; // 16 hex hane
  }

  // ---------- yaklaş-yakala (harita spawn'ı) ----------
  function catchSpawn(sp) {
    if (KD.storage.isSpawnCaught(sp.id)) { toast('Bu kediyi zaten yakaladın 😸'); return; }
    startGame(q => {
      const cat = KD.catgen.create({ quality: q, rarityKey: sp.rarity, lat: sp.lat, lng: sp.lng });
      cat.name = sp.name;
      cat.source = 'map';
      cat.verified = false;
      KD.storage.add(cat);
      KD.storage.markSpawnCaught(sp.id);
      const xpGain = ({ common: 15, uncommon: 28, rare: 45, epic: 70, myth: 110 }[cat.rarity] || 15) + Math.round(q * 15);
      const res = KD.storage.registerCatch(xpGain);
      const completed = KD.storage.updateQuestsOnCatch(cat);
      renderProfile(); renderProgress();
      showReveal(cat, q, xpGain, res.leveledUp);
      completed.forEach((it, i) => setTimeout(() => { toast(`✅ Görev tamam: ${it.desc} • +${it.reward} XP`); if (KD.sound) KD.sound.play('quest'); }, 700 + i * 1500));
      if (KD.api) KD.api.submitCatch(cat);
    });
  }

  // ---------- yakalama sonucu ----------
  function doCapture(quality, verified, frame, photoColor, fp, token) {
    // kopya engeli: aynı kediyi az önce yakaladıysan tekrar sayılmaz
    if (fp && KD.storage.isDuplicate(fp)) {
      if (KD.sound) KD.sound.play('fail');
      KD.storage.addXp(5); renderProfile();
      toast('😸 Bu kediyi az önce yakaladın! Yeni bir kedi bul (+5 XP)');
      if (tracker) tracker.reset();
      return;
    }
    const lat = myPos ? myPos[0] + (Math.random() - 0.5) * 0.0008 : null;
    const lng = myPos ? myPos[1] + (Math.random() - 0.5) * 0.0008 : null;
    const cat = KD.catgen.create({ quality, lat, lng, photoColor });
    cat.verified = verified === true;
    cat.verifyToken = token || null;
    cat.hasPhoto = !!frame;
    KD.storage.add(cat);
    if (frame && KD.photos) KD.photos.save(cat.id, frame);
    const xpGain = ({ common: 20, uncommon: 35, rare: 55, epic: 80, myth: 120 }[cat.rarity] || 20)
      + Math.round(quality * 20) + (cat.verified ? 10 : 0);
    const res = KD.storage.registerCatch(xpGain);
    const completed = KD.storage.updateQuestsOnCatch(cat);
    renderProfile();
    renderProgress();
    showReveal(cat, quality, xpGain, res.leveledUp);
    completed.forEach((it, i) =>
      setTimeout(() => { toast(`✅ Görev tamam: ${it.desc} • +${it.reward} XP`); if (KD.sound) KD.sound.play('quest'); }, 700 + i * 1500));
    // paylaşımlı haritaya gönder (arka planda)
    if (KD.api) KD.api.submitCatch(cat).then(j => { if (j && j.backend) flashSynced(); });
    if (fp) KD.storage.recordFingerprint(fp);
    if (tracker) tracker.reset();
  }
  function flashSynced() {
    const el = $('#detStatus');
    if (el && $('#view-catch').classList.contains('active')) {
      // sessiz: haritaya yansıyacak
    }
  }

  function qualityLabel(q) {
    if (q > 0.85) return 'MÜKEMMEL!';
    if (q > 0.6) return 'Harika!';
    if (q > 0.35) return 'İyi';
    return 'Zar zor';
  }

  function showReveal(cat, quality, xp, leveledUp) {
    lastRevealCat = cat;
    const card = $('#revealCard');
    card.className = 'card big r-' + cat.rarity;
    card.innerHTML = `<div class="rar-strip" style="background:${cat.rarityColor}"></div>
      ${KD.catgen.catSVG(cat, 200).replace('<svg', '<svg class="cat-svg"')}
      <div class="cat-name">${cat.name}</div>
      <div class="cat-title">${cat.title}</div>
      <div class="cat-foot">
        <span class="rar-badge" style="background:${cat.rarityColor}">${cat.rarityName}</span>
        <span class="lvl-badge">Lv.${cat.level}</span>
      </div>`;
    const stars = '⭐'.repeat(Math.max(1, Math.round(quality * 5)));
    $('#revealMeta').innerHTML = `<div class="rar" style="color:${cat.rarityColor}">${cat.rarityName} kedi yakalandı!</div>
      <div class="quality">${qualityLabel(quality)} ${stars} • +${xp} XP${leveledUp ? ' • 🎉 SEVİYE ATLADIN!' : ''}</div>`;

    const reveal = $('#reveal');
    reveal.classList.remove('hidden', 'rays-on', 'rays-myth', 'show-card');
    const epicPlus = cat.rarity === 'epic' || cat.rarity === 'myth';
    if (KD.sound) KD.sound.play('success', cat.rarity);
    screenFlash(cat.rarity === 'myth' ? '#ffe9a8' : cat.rarity === 'epic' ? '#ecd9ff' : '#ffffff');
    if (epicPlus) { reveal.classList.add('rays-on'); if (cat.rarity === 'myth') reveal.classList.add('rays-myth'); }
    void reveal.offsetWidth; reveal.classList.add('show-card');
    if (epicPlus) screenShake();
    if (navigator.vibrate) navigator.vibrate(cat.rarity === 'myth' ? [0, 50, 40, 50, 40, 90] : epicPlus ? [0, 30, 30, 60] : 35);
    confetti(cat.rarity);
    if (leveledUp && KD.sound) setTimeout(() => KD.sound.play('levelup'), 650);
  }

  // ---------- ses + konfeti ----------
  let audioCtx = null;
  function beep(q) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const notes = q > 0.6 ? [523, 659, 784, 1047] : [392, 523];
      notes.forEach((f, i) => {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        o.connect(g); g.connect(audioCtx.destination);
        const t0 = audioCtx.currentTime + i * 0.08;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
        o.start(t0); o.stop(t0 + 0.2);
      });
    } catch (e) {}
  }
  function confetti(rarity) {
    const host = $('.reveal-inner');
    let colors = ['#e8893b', '#f2b134', '#5aa86a', '#4a86c5', '#9a5cc6', '#e85d75'];
    let n = 32;
    if (rarity === 'rare') n = 46;
    else if (rarity === 'epic') n = 64;
    else if (rarity === 'myth') { n = 90; colors = ['#ffd54a', '#f2b134', '#e8893b', '#fff3c4', '#ffe9a8', '#e0a83b']; }
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      const sz = 8 + Math.random() * 6;
      s.style.cssText = `position:absolute;top:8%;left:50%;width:${sz}px;height:${sz * 1.4}px;z-index:5;
        background:${colors[i % colors.length]};border:2px solid #2b2118;border-radius:2px;pointer-events:none`;
      host.appendChild(s);
      const ang = Math.random() * Math.PI * 2, dist = 90 + Math.random() * (rarity === 'myth' ? 280 : 190);
      const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist + 130;
      s.animate([
        { transform: 'translate(-50%,-50%) rotate(0)', opacity: 1 },
        { transform: `translate(${dx}px,${dy}px) rotate(${Math.random() * 900}deg)`, opacity: 0 }
      ], { duration: 1000 + Math.random() * 700, easing: 'cubic-bezier(.2,.6,.3,1)' });
      setTimeout(() => s.remove(), 1800);
    }
  }

  // ekran-çapı flash + sarsıntı
  function screenFlash(color) {
    const el = $('#fxFlash'); if (!el) return;
    el.style.background = color || '#fff';
    el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
  }
  function screenShake() {
    const app = $('#app'); if (!app) return;
    app.classList.remove('shake'); void app.offsetWidth; app.classList.add('shake');
    setTimeout(() => app.classList.remove('shake'), 600);
  }

  // ---------- butonlar ----------
  function bindButtons() {
    $('#startBtn').addEventListener('click', startCamera);
    $('#nickBtn').addEventListener('click', editNick);
    $('#welcomeStart').addEventListener('click', () => enterApp($('#welcomeNick').value));
    $('#welcomeGuest').addEventListener('click', () => enterApp(null));
    $('#welcomeX').addEventListener('click', () => { location.href = '/api/x/login'; });
    $('#welcomeNick').addEventListener('keydown', e => { if (e.key === 'Enter') enterApp($('#welcomeNick').value); });
    $('#shareBtn').addEventListener('click', () => {
      if (lastRevealCat) KD.share.shareCat(lastRevealCat, KD.api && KD.api.nick());
    });
    $('#catchBtn').addEventListener('click', async () => {
      if (!lastResult || lastResult.state !== 'ready') return;
      const btn = $('#catchBtn');
      btn.disabled = true;
      // gerçek tüy rengini, kareyi ve parmak izini al
      const frame = grabFrame();
      const photoColor = sampleVideoColor();
      const fp = computeHash();
      // sunucu-taraflı doğrulama (Workers AI) — gerçek anti-hile ikinci kapısı
      let verified = null, verifyToken = null;
      if (frame && KD.api) {
        setDetStatus('Sunucuda doğrulanıyor…', 'found');
        const r = await KD.api.verifyCatImage(frame);
        verified = r.verified; // true / false / null(AI yok)
        verifyToken = r.token || null;
      }
      btn.disabled = false;
      if (verified === false) {
        setDetStatus('Bu bir kedi değil gibi 😿 tekrar dene', 'searching');
        if (tracker) tracker.reset();
        return;
      }
      startGame(q => doCapture(q, verified, frame, photoColor, fp, verifyToken));
    });
    $('#demoBtn').addEventListener('click', () => {
      // demo: tanımayı atla, doğrudan yakalama oyununa geç (doğrulama/foto/parmak izi yok)
      if ($('#view-catch').classList.contains('active') === false) switchView('catch');
      startGame(q => doCapture(q, null, null, null, null, null));
    });
    $('#revealClose').addEventListener('click', () => {
      $('#reveal').classList.add('hidden');
      $('#revealMeta').innerHTML = '';
      renderCollection();
      if (KD.mapview && KD.mapview.refresh) KD.mapview.refresh(KD.storage.loadCollection());
      if (detecting) setDetStatus('Kedi aranıyor…', 'searching');
    });
    const closeDetail = () => { if (KD.figurine) KD.figurine.unmount(); $('#detail').classList.add('hidden'); };
    $('#detailClose').addEventListener('click', closeDetail);
    $('#detail').addEventListener('click', e => { if (e.target.id === 'detail') closeDetail(); });
  }

  // ---------- service worker ----------
  function registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    try { init(); } catch (e) { console.error('KediDex init hatası:', e); }
  });
})();
