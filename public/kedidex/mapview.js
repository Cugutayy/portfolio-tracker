/* KediDex — harita (Leaflet) + gerçek backend + yaklaş-yakala spawn'ları */
window.KD = window.KD || {};
KD.mapview = (function () {
  let map = null, layer = null, inited = false;
  let onCatch = null, lastCenter = null, spawnCache = null;
  const DEFAULT = [40.9876, 29.0257]; // Kadıköy, İstanbul
  const RANGE_M = 60;                 // bu mesafeye girince yakalanabilir

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function rarTr(key) { const r = KD.catgen.rarityByKey(key); return r ? r.name : 'Yaygın'; }
  function emojiFor(key) {
    return ({ myth: '👑', epic: '😼', rare: '😺', uncommon: '🐈', common: '🐈‍⬛' }[key]) || '🐈';
  }
  function pinIcon(emoji, cls) {
    return L.divIcon({ html: `<div class="cat-pin ${cls || ''}">${emoji}</div>`, className: '', iconSize: [30, 30], iconAnchor: [15, 28] });
  }
  function dayNum() { return Math.floor(Date.now() / 86400000); }
  function haversine(a, b, c, d) {
    const R = 6371000, toR = Math.PI / 180;
    const dLat = (c - a) * toR, dLng = (d - b) * toR;
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(a * toR) * Math.cos(c * toR) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  function setLive(state, count) {
    const el = document.querySelector('#mapLive'); if (!el) return;
    if (state === 'online') el.innerHTML = `🟢 Canlı • yakında ${count} kedi`;
    else if (state === 'empty') el.innerHTML = `🟢 Canlı • yaklaş ve yakala!`;
    else el.innerHTML = `🟡 Çevrimdışı • örnek kediler`;
  }

  // yakındaki yabani kediler (yaklaş-yakala) — güne+konuma göre üretilir, kalıcı
  function genSpawns(center) {
    const key = dayNum() + '_' + Math.round(center[0] * 1000) + '_' + Math.round(center[1] * 1000);
    if (spawnCache && spawnCache.key === key) return spawnCache.list;
    const rng = KD.catgen.mulberry32((Math.floor((center[0] + center[1]) * 1e5) ^ dayNum()) >>> 0);
    const names = ['Tekir', 'Pamuk', 'Zeytin', 'Boncuk', 'Sarman', 'Duman', 'Lokum', 'Reis', 'Maviş', 'Karamel'];
    const rar = ['common', 'common', 'uncommon', 'uncommon', 'rare', 'rare', 'epic', 'myth'];
    const list = [];
    for (let i = 0; i < 7; i++) {
      const ang = rng() * Math.PI * 2;
      const distM = 20 + rng() * 340;
      const dLat = (distM / 111000) * Math.cos(ang);
      const dLng = (distM / (111000 * Math.cos(center[0] * Math.PI / 180))) * Math.sin(ang);
      list.push({
        id: 'spawn_' + key + '_' + i,
        lat: center[0] + dLat, lng: center[1] + dLng,
        name: names[Math.floor(rng() * names.length)],
        rarity: rar[Math.floor(rng() * rar.length)]
      });
    }
    spawnCache = { key, list };
    return list;
  }

  function spawnPopup(sp, distM, caught) {
    const within = distM <= RANGE_M;
    let action;
    if (caught) action = `<div class="sp-caught">✓ Bunu zaten yakaladın</div>`;
    else if (within) action = `<button class="sp-btn" onclick="KD.mapview.tryCatch('${sp.id}')">🎯 Yaklaş-Yakala!</button>`;
    else action = `<div class="sp-far">🚶 ${distM} m uzakta — yaklaş</div>`;
    return `<b>${esc(sp.name)}</b> • ${rarTr(sp.rarity)}<br><small>yabani kedi</small><br>${action}`;
  }

  function init(center) {
    if (inited) { map.invalidateSize(); return; }
    map = L.map('map', { zoomControl: true, attributionControl: false }).setView(center || DEFAULT, 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    layer = L.layerGroup().addTo(map);
    inited = true;
  }

  function simulateOthers(c) {
    const others = ['Pamuk', 'Reis', 'Zeytin', 'Maviş'];
    const rng = KD.catgen.mulberry32(Math.floor((c[0] + c[1]) * 1000));
    for (let i = 0; i < 4; i++) {
      const dlat = (rng() - 0.5) * 0.01, dlng = (rng() - 0.5) * 0.014;
      L.marker([c[0] + dlat, c[1] + dlng], { icon: pinIcon(emojiFor('uncommon')) })
        .addTo(layer).bindPopup(`<b>${others[Math.floor(rng() * others.length)]}</b><br><small>örnek avcı (çevrimdışı)</small>`);
    }
  }

  async function render(myCats, center, catchHandler) {
    onCatch = catchHandler || onCatch;
    init(center);
    layer.clearLayers();
    const c = center || DEFAULT;
    lastCenter = c;
    const myPlayer = KD.api ? KD.api.playerId() : null;

    // benim yakaladıklarım
    myCats.forEach(cat => {
      if (cat.lat == null || cat.lng == null) return;
      L.marker([cat.lat, cat.lng], { icon: pinIcon('🐱', 'mine') })
        .addTo(layer).bindPopup(`<b>${esc(cat.name)}</b><br>${esc(cat.rarityName)} • Lv.${cat.level}<br><small>senin buluşun</small>`);
    });

    // backend'ten diğer oyuncular (bilgi amaçlı)
    let nearby = null;
    if (KD.api) { try { nearby = await KD.api.fetchNearby(c[0], c[1], 8); } catch (e) {} }
    if (Array.isArray(nearby)) {
      nearby.forEach(cat => {
        if (cat.player_id === myPlayer || cat.lat == null) return;
        L.marker([cat.lat, cat.lng], { icon: pinIcon(emojiFor(cat.rarity), cat.rarity === 'myth' ? 'glow' : '') })
          .addTo(layer).bindPopup(`<b>${esc(cat.cat_name)}</b><br>${rarTr(cat.rarity)} • Lv.${cat.level}<br><small>${esc(cat.player_name) || 'bir avcı'}${cat.verified ? ' • ✓' : ''}</small>`);
      });
      setLive('online', nearby.length);
    } else { simulateOthers(c); setLive('offline'); }

    // yaklaş-yakala spawn'ları
    let inRange = 0;
    genSpawns(c).forEach(sp => {
      const caught = KD.storage.isSpawnCaught(sp.id);
      const distM = Math.round(haversine(c[0], c[1], sp.lat, sp.lng));
      const within = !caught && distM <= RANGE_M;
      if (within) inRange++;
      const cls = caught ? 'spawn caught' : (within ? 'spawn ready' : 'spawn');
      L.marker([sp.lat, sp.lng], { icon: pinIcon(caught ? '✓' : emojiFor(sp.rarity), cls) })
        .addTo(layer).bindPopup(spawnPopup(sp, distM, caught));
    });
    if (inRange) setLive('online', inRange);
    else if (Array.isArray(nearby) && !nearby.length) setLive('empty');

    // benim konumum + menzil dairesi
    L.circle(c, { radius: RANGE_M, color: '#5aa86a', weight: 2, fillColor: '#5aa86a', fillOpacity: 0.08 }).addTo(layer);
    L.circleMarker(c, { radius: 7, color: '#2b2118', weight: 3, fillColor: '#e8893b', fillOpacity: 1 })
      .addTo(layer).bindPopup('Buradasın');
    map.setView(c, map.getZoom() || 16);
    setTimeout(() => map.invalidateSize(), 120);
  }

  // popup butonundan çağrılır
  function tryCatch(id) {
    if (!lastCenter || !spawnCache) return;
    const sp = spawnCache.list.find(s => s.id === id);
    if (!sp || KD.storage.isSpawnCaught(sp.id)) return;
    const distM = haversine(lastCenter[0], lastCenter[1], sp.lat, sp.lng);
    if (distM > RANGE_M) return;
    map.closePopup();
    if (onCatch) onCatch(sp);
  }

  function refresh(myCats) { if (inited && lastCenter) render(myCats, lastCenter, onCatch); }

  return { init, render, tryCatch, refresh, DEFAULT, RANGE_M,
    _spawns: () => (spawnCache ? spawnCache.list.slice() : []), _center: () => lastCenter,
    _dist: (sp) => (lastCenter ? Math.round(haversine(lastCenter[0], lastCenter[1], sp.lat, sp.lng)) : null) };
})();
