// Public, fixed-author source reader. No exchange keys, account data or order routes.
const UID = 'c1IlgGbj09LvsTkQR4-mUA';
const FEED = 'https://www.binance.com/bapi/composite/v2/friendly/pgc/content/queryUserProfilePageContentsWithFilter';
let cache;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') return res.status(405).json({error: 'METHOD_NOT_ALLOWED'});
  const offset = String(req.query?.offset ?? '-1');
  if (!/^-?\d{1,16}$/.test(offset) || !Number.isSafeInteger(Number(offset)) || Number(offset) < -1) return res.status(400).json({error:'INVALID_OFFSET'});
  if (cache && cache.offset === offset && Date.now() - cache.fetched_at < 15000) return res.status(200).json(cache);
  try {
    const response = await fetch(`${FEED}?targetSquareUid=${encodeURIComponent(UID)}&timeOffset=${offset}&filterType=ALL`, {
      redirect: 'manual', signal: AbortSignal.timeout(15000),
      headers: {'Accept': 'application/json', 'Cache-Control': 'no-cache'}
    });
    if (response.status !== 200) return res.status(502).json({error: 'SOURCE_UNAVAILABLE', upstream_status: response.status});
    const raw = await response.json();
    const rows = raw?.data?.contents;
    if (raw.code !== '000000' || raw.success !== true || !Array.isArray(rows) || (offset === '-1' && !rows.length) || rows.length > 100) throw Error('schema');
    const posts = rows.map(r => {
      const id = String(r.id), published = Number(r.firstReleaseTime);
      if (r.squareUid !== UID || r.username?.toLowerCase() !== 'realarashi' || !/^\d+$/.test(id)
          || typeof r.bodyTextOnly !== 'string' || !Number.isSafeInteger(published)
          || published < 1500000000000 || published > Date.now() + 10000) throw Error('author/schema');
      return {id, author_id: UID, author_slug: r.username, author_name: r.displayName || r.username,
        url: `https://www.binance.com/en/square/post/${id}`, published_at: Math.floor(published / 1000),
        text: `${r.title || ''}\n${r.bodyTextOnly}`.trim(), pinned: !!r.isStickyToTop,
        quoted_post_id: r.quotedContentId ? String(r.quotedContentId) : null};
    });
    if (new Set(posts.map(p => p.id)).size !== posts.length) throw Error('duplicate');
    cache = {fetched_at: Date.now(), source: 'binance-square', author_id: UID, offset, next_offset: raw.data.timeOffset ?? null, posts};
    return res.status(200).json(cache);
  } catch {
    return res.status(502).json({error: 'SOURCE_NETWORK_OR_SCHEMA_FAILURE'});
  }
}
