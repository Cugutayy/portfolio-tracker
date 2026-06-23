/* KediDex — backend API istemcisi (Cloudflare Pages Functions)
   Aynı origin /api/* kullanır. Backend yoksa (statik servis) zarifçe başarısız olur
   ve uygulama yerel moda düşer. */
window.KD = window.KD || {};
KD.api = (function () {
  const BASE = (window.KEDIDEX_API || '/api').replace(/\/$/, '');
  let online = null; // null=bilinmiyor, true/false=son durum

  function uuid() {
    return (crypto.randomUUID ? crypto.randomUUID()
      : 'p_' + Math.random().toString(36).slice(2) + Date.now().toString(36));
  }
  function playerId() {
    let id = localStorage.getItem('kedidex.v1.playerId');
    if (!id) { id = uuid(); localStorage.setItem('kedidex.v1.playerId', id); }
    return id;
  }
  function nick() { return localStorage.getItem('kedidex.v1.nick') || ''; }
  function setNick(n) { localStorage.setItem('kedidex.v1.nick', String(n || '').slice(0, 24)); }
  function isOnline() { return online; }

  async function submitCatch(cat) {
    try {
      const res = await fetch(BASE + '/catches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cat.id, playerId: playerId(), playerName: nick(),
          catName: cat.name, title: cat.title, rarity: cat.rarity,
          seed: cat.seed, level: cat.level, quality: cat.quality,
          verified: cat.verified ? 1 : 0, token: cat.verifyToken || null, breed: cat.breed || null, lat: cat.lat, lng: cat.lng
        })
      });
      const j = await res.json();
      online = !!j.backend;
      return j;
    } catch (e) { online = false; return { ok: false, backend: false, error: String(e) }; }
  }

  // dönüş: dizi (backend var) | null (backend yok/ulaşılamadı)
  async function fetchNearby(lat, lng, km = 6) {
    try {
      const q = (Number.isFinite(lat) && Number.isFinite(lng)) ? `?lat=${lat}&lng=${lng}&km=${km}` : '';
      const res = await fetch(BASE + '/catches' + q);
      const j = await res.json();
      online = !!j.backend;
      return j.backend ? (j.catches || []) : null;
    } catch (e) { online = false; return null; }
  }

  // paylaşım kartını sunucuya yükle (showcase /c/<id> için)
  async function uploadCard(id, dataUrl) {
    try {
      const r = await fetch(BASE + '/card', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, img: dataUrl })
      });
      return await r.json();
    } catch (e) { return { ok: false }; }
  }

  // X (Twitter) oturum durumu
  async function xMe() {
    try { const r = await fetch(BASE + '/x/me', { credentials: 'same-origin' }); return await r.json(); }
    catch (e) { return { configured: false, loggedIn: false }; }
  }

  // dönüş: {verified: true|false|null}
  async function verifyCatImage(dataUrl) {
    try {
      const res = await fetch(BASE + '/verify-cat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl })
      });
      return await res.json();
    } catch (e) { return { verified: null, error: String(e) }; }
  }

  return { playerId, nick, setNick, submitCatch, fetchNearby, verifyCatImage, uploadCard, xMe, isOnline, BASE };
})();
