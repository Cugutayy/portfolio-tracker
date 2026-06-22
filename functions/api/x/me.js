// Cloudflare Pages Function: /api/x/me
// İmzalı oturum çerezini doğrular, X kimliğini döndürür.

function parseCookies(h) {
  const o = {};
  (h || '').split(/; */).forEach(p => { const i = p.indexOf('='); if (i > 0) o[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1)); });
  return o;
}
function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s); const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}
function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return b64url(sig);
}
const json = (o) => new Response(JSON.stringify(o), {
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

export async function onRequestGet({ request, env }) {
  if (!env.X_CLIENT_ID) return json({ configured: false, loggedIn: false });
  const cookies = parseCookies(request.headers.get('Cookie'));
  const s = cookies.x_user;
  if (!s || !env.X_CLIENT_SECRET) return json({ configured: true, loggedIn: false });
  const dot = s.lastIndexOf('.');
  if (dot < 0) return json({ configured: true, loggedIn: false });
  const payload = s.slice(0, dot), sig = s.slice(dot + 1);
  const expect = await hmac(env.X_CLIENT_SECRET, payload);
  if (expect !== sig) return json({ configured: true, loggedIn: false });
  try {
    const data = JSON.parse(new TextDecoder().decode(b64urlToBytes(payload)));
    return json({ configured: true, loggedIn: true, username: data.username, name: data.name, id: data.id });
  } catch (e) { return json({ configured: true, loggedIn: false }); }
}
