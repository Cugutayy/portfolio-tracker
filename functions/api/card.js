// Cloudflare Pages Function: POST /api/card
// Paylaşım kartı görselini (JPEG, base64) D1'de saklar -> /c/<id> sayfasında OG görseli olur.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: CORS });

let ready = false;
async function ensureCards(db) {
  if (ready) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS cards (id TEXT PRIMARY KEY, img TEXT, created_at INTEGER)`).run();
  ready = true;
}

export function onRequestOptions() { return new Response('', { headers: CORS }); }

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, backend: false });
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'bad-json' }, 400); }
  const id = String(body.id || '').slice(0, 64);
  let img = String(body.img || body.png || '');
  if (img.includes(',')) img = img.split(',').pop();
  if (!id || !img || img.length > 350000) return json({ ok: false, error: 'bad-input' }, 400);
  try {
    await ensureCards(env.DB);
    await env.DB.prepare('INSERT OR REPLACE INTO cards (id,img,created_at) VALUES (?,?,?)')
      .bind(id, img, Date.now()).run();
    return json({ ok: true, id });
  } catch (e) { return json({ ok: false, error: String(e.message || e) }, 500); }
}
