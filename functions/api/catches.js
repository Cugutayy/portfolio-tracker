// Cloudflare Pages Function: /api/catches
// KediDex paylaşımlı yakalama kaydı (Cloudflare D1)
//   GET  /api/catches?lat=&lng=&km=   -> yakındaki son yakalamalar (tüm oyuncular)
//   POST /api/catches                 -> yeni yakalama kaydet
// D1 binding adı: DB (Pages > Settings > Functions > D1 bindings)
// Binding yoksa graceful: boş döner, istemci yerel moda düşer.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, ...extra } });

let tableReady = false;
async function ensureTable(db) {
  if (tableReady) return;
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS catches (
      id TEXT PRIMARY KEY,
      player_id TEXT,
      player_name TEXT,
      cat_name TEXT,
      title TEXT,
      rarity TEXT,
      seed INTEGER,
      level INTEGER,
      quality INTEGER,
      verified INTEGER DEFAULT 0,
      breed TEXT,
      lat REAL,
      lng REAL,
      created_at INTEGER
    )`
  ).run();
  await db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_catches_geo_time ON catches (lat, lng, created_at)`
  ).run();
  // mevcut tablolar için göç (sütun yoksa ekle)
  try { await db.prepare(`ALTER TABLE catches ADD COLUMN breed TEXT`).run(); } catch (e) { /* zaten var */ }
  tableReady = true;
}

function clampInt(v, def, lo, hi) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return def;
  return Math.max(lo, Math.min(hi, n));
}

export function onRequestOptions() {
  return new Response('', { headers: CORS });
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ catches: [], backend: false });
  try {
    await ensureTable(env.DB);
    const url = new URL(request.url);
    const lat = parseFloat(url.searchParams.get('lat'));
    const lng = parseFloat(url.searchParams.get('lng'));
    const km = Math.min(Math.max(parseFloat(url.searchParams.get('km')) || 5, 0.2), 50);

    let stmt;
    const cols = `id,player_id,player_name,cat_name,title,rarity,seed,level,quality,verified,breed,lat,lng,created_at`;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const dLat = km / 111;
      const dLng = km / ((111 * Math.cos((lat * Math.PI) / 180)) || 1);
      stmt = env.DB.prepare(
        `SELECT ${cols} FROM catches
         WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
         ORDER BY created_at DESC LIMIT 300`
      ).bind(lat - dLat, lat + dLat, lng - dLng, lng + dLng);
    } else {
      stmt = env.DB.prepare(`SELECT ${cols} FROM catches ORDER BY created_at DESC LIMIT 300`);
    }
    const { results } = await stmt.all();
    return json({ catches: results || [], backend: true, count: (results || []).length });
  } catch (e) {
    return json({ catches: [], backend: true, error: String(e.message || e) }, 200);
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, backend: false, reason: 'no-db' });
  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'bad-json' }, 400); }

  const id = String(body.id || crypto.randomUUID()).slice(0, 64);
  const playerId = (String(body.playerId || '').slice(0, 64)) || 'anon';
  const playerName = String(body.playerName || '').slice(0, 24);
  const catName = String(body.catName || 'Kedi').slice(0, 32);
  const title = String(body.title || '').slice(0, 48);
  const rarity = String(body.rarity || 'common').slice(0, 16);
  const seed = clampInt(body.seed, 0, 0, 4294967295);
  const level = clampInt(body.level, 1, 1, 999);
  const quality = clampInt(body.quality, 0, 0, 100);
  const verified = body.verified ? 1 : 0;
  const breed = body.breed ? String(body.breed).slice(0, 16) : null;

  let lat = parseFloat(body.lat), lng = parseFloat(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) { lat = null; lng = null; }
  else {
    // gizlilik: ~100m hassasiyete yuvarla (ev konumunu açık etme)
    lat = Math.round(lat * 1000) / 1000;
    lng = Math.round(lng * 1000) / 1000;
  }
  const createdAt = Date.now();

  try {
    await ensureTable(env.DB);
    await env.DB.prepare(
      `INSERT OR REPLACE INTO catches
       (id,player_id,player_name,cat_name,title,rarity,seed,level,quality,verified,breed,lat,lng,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(id, playerId, playerName, catName, title, rarity, seed, level, quality, verified, breed, lat, lng, createdAt).run();
    return json({ ok: true, id, backend: true });
  } catch (e) {
    return json({ ok: false, backend: true, error: String(e.message || e) }, 500);
  }
}
