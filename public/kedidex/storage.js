/* KediDex — kalıcı depolama (localStorage) */
window.KD = window.KD || {};
KD.storage = (function () {
  const CKEY = 'kedidex.v1.collection';
  const PKEY = 'kedidex.v1.profile';

  function loadCollection() {
    try { return JSON.parse(localStorage.getItem(CKEY)) || []; }
    catch (e) { return []; }
  }
  function saveCollection(list) {
    localStorage.setItem(CKEY, JSON.stringify(list));
  }
  function add(cat) {
    const list = loadCollection();
    list.unshift(cat);
    saveCollection(list);
    return cat;
  }
  function getById(id) {
    return loadCollection().find(c => c.id === id);
  }

  function loadProfile() {
    try {
      const p = JSON.parse(localStorage.getItem(PKEY));
      if (p) return p;
    } catch (e) {}
    return { xp: 0, level: 1, streak: 0, lastCatchDay: null, totalCatches: 0 };
  }
  function saveProfile(p) {
    localStorage.setItem(PKEY, JSON.stringify(p));
  }

  // XP'yi ekle, seviye/seri hesapla. Dönen: {leveledUp, profile}
  function registerCatch(xpGain) {
    const p = loadProfile();
    const today = new Date().toISOString().slice(0, 10);
    if (p.lastCatchDay !== today) {
      const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      p.streak = (p.lastCatchDay === yesterday) ? (p.streak || 0) + 1 : 1;
      p.lastCatchDay = today;
    }
    p.totalCatches = (p.totalCatches || 0) + 1;
    p.xp = (p.xp || 0) + xpGain;
    let leveledUp = false;
    while (p.xp >= xpForLevel(p.level)) {
      p.xp -= xpForLevel(p.level);
      p.level++;
      leveledUp = true;
    }
    saveProfile(p);
    return { leveledUp, profile: p };
  }
  function xpForLevel(lvl) { return 100 + (lvl - 1) * 60; }

  // XP ekle + seviye hesapla (görev ödülleri için)
  function addXp(amount) {
    const p = loadProfile();
    p.xp = (p.xp || 0) + amount;
    let leveledUp = false;
    while (p.xp >= xpForLevel(p.level)) { p.xp -= xpForLevel(p.level); p.level++; leveledUp = true; }
    saveProfile(p);
    return { leveledUp, profile: p };
  }

  // ---------- GÜNLÜK GÖREVLER ----------
  const QKEY = 'kedidex.v1.quests';
  const QUEST_POOL = [
    { id: 'catch3',   desc: 'Bugün 3 kedi yakala',            goal: 3, type: 'catch',    reward: 40 },
    { id: 'rare1',    desc: '1 Nadir veya üstü yakala',       goal: 1, type: 'rarePlus', reward: 50 },
    { id: 'verified2',desc: '2 doğrulanmış kedi yakala',      goal: 2, type: 'verified', reward: 45 },
    { id: 'coat2',    desc: '2 farklı türde kedi yakala',     goal: 2, type: 'coat',     reward: 35 },
    { id: 'perfect1', desc: '1 mükemmel yakalama (kalite≥85)',goal: 1, type: 'perfect',  reward: 45 },
    { id: 'catch5',   desc: 'Bugün 5 kedi yakala',            goal: 5, type: 'catch',    reward: 60 }
  ];
  function today() { return new Date().toISOString().slice(0, 10); }
  function loadQuestsRaw() { try { return JSON.parse(localStorage.getItem(QKEY)); } catch (e) { return null; } }
  function ensureDailyQuests() {
    let q = loadQuestsRaw();
    const d = today();
    if (!q || q.day !== d) {
      // güne göre deterministik 3 görev seç
      let seed = 0; for (let i = 0; i < d.length; i++) seed = (seed * 31 + d.charCodeAt(i)) >>> 0;
      const pool = QUEST_POOL.slice();
      const items = [];
      for (let i = 0; i < 3 && pool.length; i++) {
        seed = (seed * 1103515245 + 12345) >>> 0;
        const idx = seed % pool.length;
        const base = pool.splice(idx, 1)[0];
        items.push({ ...base, prog: 0, done: false });
      }
      q = { day: d, items, coats: [] };
      localStorage.setItem(QKEY, JSON.stringify(q));
    }
    return q;
  }
  // yakalama sonrası görevleri güncelle; tamamlananları döndür (+ödül XP verir)
  function updateQuestsOnCatch(cat) {
    const q = ensureDailyQuests();
    const rarePlus = ['rare', 'epic', 'myth'].includes(cat.rarity);
    if (cat.coat && !q.coats.includes(cat.coat)) q.coats.push(cat.coat);
    const completed = [];
    q.items.forEach(it => {
      if (it.done) return;
      let inc = 0;
      if (it.type === 'catch') inc = 1;
      else if (it.type === 'rarePlus') inc = rarePlus ? 1 : 0;
      else if (it.type === 'verified') inc = cat.verified ? 1 : 0;
      else if (it.type === 'perfect') inc = (cat.quality >= 85) ? 1 : 0;
      else if (it.type === 'coat') it.prog = q.coats.length;
      if (it.type !== 'coat') it.prog = Math.min(it.goal, it.prog + inc);
      if (!it.done && it.prog >= it.goal) {
        it.done = true;
        addXp(it.reward);
        completed.push(it);
      }
    });
    localStorage.setItem(QKEY, JSON.stringify(q));
    return completed;
  }

  // ---------- HARİTA SPAWN'LARI (yaklaş-yakala; aynısı 2 kez alınmaz) ----------
  const SPKEY = 'kedidex.v1.caughtSpawns';
  function loadCaughtSpawns() { try { return JSON.parse(localStorage.getItem(SPKEY)) || []; } catch (e) { return []; } }
  function isSpawnCaught(id) { return loadCaughtSpawns().includes(id); }
  function markSpawnCaught(id) {
    const l = loadCaughtSpawns();
    if (!l.includes(id)) { l.push(id); localStorage.setItem(SPKEY, JSON.stringify(l.slice(-1000))); }
  }

  // ---------- KOPYA ENGELİ (algısal parmak izi) ----------
  const FPKEY = 'kedidex.v1.fps';
  function loadFps() { try { return JSON.parse(localStorage.getItem(FPKEY)) || []; } catch (e) { return []; } }
  function hamming(a, b) {
    let d = 0; const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) { let x = (parseInt(a[i], 16) ^ parseInt(b[i], 16)); while (x) { d += x & 1; x >>= 1; } }
    return d + Math.abs(a.length - b.length) * 4;
  }
  // son 20 dk içinde çok benzer bir kedi yakalandı mı?
  function isDuplicate(fp, maxAgeMin = 20, maxDist = 6) {
    if (!fp) return false;
    const now = Date.now();
    return loadFps().some(e => (now - e.t) < maxAgeMin * 60000 && hamming(e.fp, fp) <= maxDist);
  }
  function recordFingerprint(fp) {
    if (!fp) return;
    const list = loadFps().filter(e => (Date.now() - e.t) < 60 * 60000);
    list.push({ fp, t: Date.now() });
    localStorage.setItem(FPKEY, JSON.stringify(list.slice(-50)));
  }

  // ---------- ROZETLER ----------
  const BADGES = [
    { id: 'first',     name: 'İlk Pati',        emoji: '🐾', test: c => c.length >= 1 },
    { id: 'five',      name: 'Mahalle Çetesi',  emoji: '🏘️', test: c => c.length >= 5 },
    { id: 'ten',       name: 'Koleksiyoncu',    emoji: '📒', test: c => c.length >= 10 },
    { id: 'myth',      name: 'Efsane Avcısı',   emoji: '👑', test: c => c.some(x => x.rarity === 'myth') },
    { id: 'rainbow',   name: 'Gökkuşağı',       emoji: '🌈', test: c => new Set(c.map(x => x.rarity)).size >= 5 },
    { id: 'verified5', name: 'Sahici Avcı',     emoji: '✅', test: c => c.filter(x => x.verified).length >= 5 },
    { id: 'sniper',    name: 'Keskin Nişancı',  emoji: '🎯', test: c => c.some(x => x.quality >= 90) }
  ];
  function computeBadges() {
    const c = loadCollection();
    return BADGES.map(b => ({ id: b.id, name: b.name, emoji: b.emoji, earned: b.test(c) }));
  }

  // ---------- DEX TAMAMLAMA (nadirlik + tür keşfi) ----------
  function computeDex() {
    const c = loadCollection();
    const known = (window.KD.catgen && window.KD.catgen.coatNames) || [];
    const rar = new Set(c.map(x => x.rarity));
    const coats = new Set(c.map(x => x.coat).filter(n => known.includes(n)));
    const totalRar = 5, totalCoats = known.length || 6;
    const discovered = rar.size + coats.size;
    const total = totalRar + totalCoats;
    return { discovered, total, pct: Math.round((discovered / total) * 100), rarSize: rar.size, coatSize: coats.size, totalCoats };
  }

  return {
    loadCollection, saveCollection, add, getById,
    loadProfile, saveProfile, registerCatch, xpForLevel, addXp,
    ensureDailyQuests, updateQuestsOnCatch, computeBadges, computeDex,
    isDuplicate, recordFingerprint,
    isSpawnCaught, markSpawnCaught
  };
})();
