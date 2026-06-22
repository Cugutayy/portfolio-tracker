// Cloudflare Pages Function: /api/x/callback
// X OAuth 2.0 dönüşü: code -> token -> kullanıcı -> imzalı oturum çerezi.
// Env: X_CLIENT_ID, X_CLIENT_SECRET (zorunlu), X_REDIRECT_URI (ops.)

function parseCookies(h) {
  const o = {};
  (h || '').split(/; */).forEach(p => { const i = p.indexOf('='); if (i > 0) o[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1)); });
  return o;
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
function appRedirect(url, err) {
  const to = url.origin + '/kedidex/' + (err ? ('?x_err=' + err) : '?x=1');
  return new Response(null, { status: 302, headers: { Location: to } });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (!env.X_CLIENT_ID || !env.X_CLIENT_SECRET) return appRedirect(url, 'config');

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookies = parseCookies(request.headers.get('Cookie'));
  if (!code || !state || state !== cookies.x_state || !cookies.x_verifier) return appRedirect(url, 'state');

  const redirectUri = env.X_REDIRECT_URI || (url.origin + '/api/x/callback');
  try {
    const basic = btoa(`${env.X_CLIENT_ID}:${env.X_CLIENT_SECRET}`);
    const body = new URLSearchParams({
      grant_type: 'authorization_code', code, redirect_uri: redirectUri,
      code_verifier: cookies.x_verifier, client_id: env.X_CLIENT_ID
    });
    const tok = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${basic}` },
      body
    });
    const tj = await tok.json();
    if (!tj.access_token) return appRedirect(url, 'token');

    const me = await fetch('https://api.twitter.com/2/users/me', {
      headers: { Authorization: `Bearer ${tj.access_token}` }
    });
    const mj = await me.json();
    const u = (mj && mj.data) || {};
    if (!u.username) return appRedirect(url, 'me');

    const payload = b64url(new TextEncoder().encode(JSON.stringify({
      id: u.id, username: u.username, name: u.name, t: Date.now()
    })));
    const sig = await hmac(env.X_CLIENT_SECRET, payload);
    const session = `${payload}.${sig}`;
    const secure = url.protocol === 'https:' ? '; Secure' : '';

    const headers = new Headers({ Location: url.origin + '/kedidex/?x=1' });
    headers.append('Set-Cookie', `x_user=${session}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=2592000`);
    headers.append('Set-Cookie', `x_state=; Path=/; Max-Age=0`);
    headers.append('Set-Cookie', `x_verifier=; Path=/; Max-Age=0`);
    return new Response(null, { status: 302, headers });
  } catch (e) {
    return appRedirect(url, 'exch');
  }
}
