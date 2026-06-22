// Cloudflare Pages Function: /api/x/login
// X (Twitter) OAuth 2.0 PKCE girişini başlatır.
// Env: X_CLIENT_ID (zorunlu), X_REDIRECT_URI (ops.)
// Yapılandırılmadıysa graceful: 503 -> frontend butonu gizler.

function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function randUrl(n) {
  const a = new Uint8Array(n); crypto.getRandomValues(a); return b64url(a.buffer);
}
async function sha256(s) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); }

export async function onRequestGet({ request, env }) {
  if (!env.X_CLIENT_ID) return new Response('X login yapılandırılmadı', { status: 503 });
  const url = new URL(request.url);
  const redirectUri = env.X_REDIRECT_URI || (url.origin + '/api/x/callback');
  const state = randUrl(16);
  const verifier = randUrl(48);
  const challenge = b64url(await sha256(verifier));

  const auth = new URL('https://twitter.com/i/oauth2/authorize');
  auth.searchParams.set('response_type', 'code');
  auth.searchParams.set('client_id', env.X_CLIENT_ID);
  auth.searchParams.set('redirect_uri', redirectUri);
  auth.searchParams.set('scope', 'users.read tweet.read');
  auth.searchParams.set('state', state);
  auth.searchParams.set('code_challenge', challenge);
  auth.searchParams.set('code_challenge_method', 'S256');

  const secure = url.protocol === 'https:' ? '; Secure' : '';
  const ck = (n, v) => `${n}=${v}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=600`;
  const headers = new Headers({ Location: auth.toString() });
  headers.append('Set-Cookie', ck('x_state', state));
  headers.append('Set-Cookie', ck('x_verifier', verifier));
  return new Response(null, { status: 302, headers });
}
