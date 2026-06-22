// Cloudflare Pages Function: GET /api/card/<id>(.jpg)
// Saklanan paylaşım kartını JPEG olarak döndürür (OG görseli).
export async function onRequestGet({ params, env }) {
  const raw = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = String(raw || '').replace(/\.(jpg|jpeg|png)$/i, '');
  if (!env.DB || !id) return new Response('not found', { status: 404 });
  try {
    const row = await env.DB.prepare('SELECT img FROM cards WHERE id=?').bind(id).first();
    if (!row || !row.img) return new Response('not found', { status: 404 });
    const bytes = Uint8Array.from(atob(row.img), c => c.charCodeAt(0));
    return new Response(bytes, {
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' }
    });
  } catch (e) { return new Response('error', { status: 500 }); }
}
