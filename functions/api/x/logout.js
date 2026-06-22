// Cloudflare Pages Function: /api/x/logout — oturum çerezini siler.
export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const headers = new Headers({ Location: url.origin + '/kedidex/' });
  headers.append('Set-Cookie', 'x_user=; Path=/; HttpOnly; Max-Age=0');
  return new Response(null, { status: 302, headers });
}
