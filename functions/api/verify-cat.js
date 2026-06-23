// Cloudflare Pages Function: /api/verify-cat
// Sunucu-taraflı kedi doğrulama (Workers AI görüntü sınıflandırma).
// İstemci (COCO-SSD) "kedi" dedikten sonra yakalanan kare buraya gönderilir;
// sunucu bağımsız bir modelle ikinci kez doğrular -> hile çok zorlaşır.
// AI binding adı: AI (Pages > Settings > Functions > Workers AI binding).
// Binding yoksa graceful: verified=null döner, istemci kendi kararını kullanır.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: CORS });

const CAT_RE = /\bcat\b|tabby|kitten|feline|persian|siamese|egyptian cat|tiger cat|lynx|cougar|leopard|jaguar/i;

function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)));
}
// "kedi doğrulandı" kanıtı: ts.sig (2 dk geçerli) — istemci bunu /api/catches'e iletir
async function signToken(secret) {
  const ts = Date.now();
  return ts + '.' + (await hmac(secret, 'cat|' + ts));
}

export function onRequestOptions() {
  return new Response('', { headers: CORS });
}

export async function onRequestPost({ request, env }) {
  if (!env.AI) return json({ verified: null, reason: 'ai-unbound' });
  let body;
  try { body = await request.json(); }
  catch { return json({ verified: null, error: 'bad-json' }, 400); }

  const dataUrl = String(body.image || '');
  const b64 = dataUrl.includes(',') ? dataUrl.split(',').pop() : dataUrl;
  if (!b64) return json({ verified: null, error: 'no-image' }, 400);

  try {
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const out = await env.AI.run('@cf/microsoft/resnet-50', { image: [...bytes] });
    const labels = (Array.isArray(out) ? out : [])
      .map(r => ({ label: String(r.label || ''), score: Number(r.score || 0) }))
      .sort((a, b) => b.score - a.score);
    const hit = labels.find(l => CAT_RE.test(l.label));
    const secret = env.VERIFY_SECRET || env.X_CLIENT_SECRET;
    const token = (hit && secret) ? await signToken(secret) : null;
    return json({
      verified: !!hit,
      token,
      label: hit ? hit.label : (labels[0] ? labels[0].label : ''),
      score: hit ? hit.score : (labels[0] ? labels[0].score : 0),
      top: labels.slice(0, 3),
    });
  } catch (e) {
    return json({ verified: null, error: String(e.message || e) }, 200);
  }
}
