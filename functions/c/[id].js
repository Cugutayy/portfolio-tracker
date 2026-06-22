// Cloudflare Pages Function: GET /c/<id>
// Paylaşım showcase sayfası — X/WhatsApp link önizlemesinde kartı gösterir (OG meta).
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const RAR = { common: 'Yaygın', uncommon: 'Sıradışı', rare: 'Nadir', epic: 'Efsanevi', myth: 'Mitik' };

export async function onRequestGet({ params, env, request }) {
  const url = new URL(request.url);
  const id = String((Array.isArray(params.id) ? params.id[0] : params.id) || '').replace(/\.html$/i, '');

  let cat = null;
  if (env.DB && id) {
    try {
      cat = await env.DB.prepare(
        'SELECT cat_name,title,rarity,player_name,breed FROM catches WHERE id=?'
      ).bind(id).first();
    } catch (e) {}
  }

  const name = (cat && cat.cat_name) || 'Bir sokak kedisi';
  const rar = (cat && RAR[cat.rarity]) || '';
  const who = (cat && cat.player_name) || 'bir avcı';
  const img = `${url.origin}/api/card/${encodeURIComponent(id)}.jpg`;
  const appUrl = `${url.origin}/kedidex/`;
  const title = `${name} — KediDex`;
  const desc = `${rar ? rar + ' ' : ''}sokak kedisi, ${who} tarafından KediDex'te yakalandı. Sen de kendi kedilerini topla! 🐾`;

  const html = `<!DOCTYPE html>
<html lang="tr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:url" content="${esc(url.origin)}/c/${esc(id)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(img)}">
<style>
  body{margin:0;font-family:'Baloo 2',system-ui,sans-serif;background:#f4ead3;color:#2b2118;
    display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:18px;padding:24px;text-align:center}
  img{max-width:340px;width:88%;border:4px solid #2b2118;border-radius:18px;box-shadow:6px 6px 0 #2b2118}
  h1{margin:0;font-size:26px}
  a{background:#e8893b;color:#fff;font-weight:800;text-decoration:none;padding:14px 22px;
    border:4px solid #2b2118;border-radius:16px;box-shadow:4px 4px 0 #2b2118}
  .sub{color:#6c5f4c;font-weight:600;margin-top:-8px}
</style>
</head><body>
  <img src="${esc(img)}" alt="${esc(name)}" onerror="this.style.display='none'">
  <h1>🐾 ${esc(name)}</h1>
  <div class="sub">${esc(rar)} ${cat && cat.breed ? '• 🇹🇷 ' + esc(cat.breed === 'van' ? 'Van Kedisi' : 'Ankara Kedisi') : ''}</div>
  <a href="${esc(appUrl)}">KediDex'te kendi kedilerini topla</a>
</body></html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' }
  });
}
