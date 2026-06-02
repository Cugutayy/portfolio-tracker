// ─────────────────────────────────────────────────────────────
// Seed social activity for the demo users: likes + funny, realistic
// Turkish comments on each other. Everyone likes Çağatay (hyperliquid).
// Idempotent: clears demo-authored likes/comments first.
//
// Run:  set -a; . ./.env.local; set +a; node scripts/seed-social.mjs
// ─────────────────────────────────────────────────────────────
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;

const CAGATAY_EMAIL = "cugutayy@gmail.com";

// admiring / banter lines aimed at Çağatay's portfolio
const CAGATAY = [
  "DEÜ İşletme Fakültesi'nin selamı var hocam 🎓",
  "reis bu işi biliyo, helal",
  "bro bu nasıl portföy ya, kral",
  "noluyo burda, adam coşmuş",
  "short long hepsi var, profesyonel iş",
  "10x kaldıraçla bile soğukkanlı, saygı duydum",
  "abi bana da bi öneri ver",
  "çağatay'a güven tam",
  "bu adam piyasayı yönetiyor resmen",
  "ben de aynısına gireyim mi reis",
  "elinize sağlık, portföy şahane",
  "kralın portföyü bu işte 👑",
];

// generic cross-arena comments (teasing + admiring, dozunda)
const GENERIC = [
  "bu kadar NVDA fazla değil mi 😅",
  "BTC short açana saygı duyuyorum",
  "stop koy bi yere kanka",
  "risk yönetimi nerede bro",
  "valla tuttu, helal olsun",
  "ASELS sevdası bitmez bizde",
  "temettü babası 💰",
  "bu ne cesaret ya",
  "ayı piyasası gelince görüşürüz",
  "tam boğa olmuşsun",
  "gece gece ne işin var borsada",
  "düşüşten alana selam",
  "portföyü görünce kendiminkinden utandım",
  "panikleme tut kanka",
  "bunu nerden buldun ya",
  "kaldıraç bağımlısı olmuşsun 😂",
  "hocam ben de katılabilir miyim",
  "abi bu coin batar dikkat et",
  "erken almışsın, gözün aydın",
  "bro bu portföy çok dağınık olmuş",
];

const shuffle = (a) => {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const q = (t, p) => pool.query(t, p);

  const all = (await q("SELECT id, handle, name, email FROM users")).rows;
  const demos = all.filter((u) => u.email.endsWith("@arena.demo"));
  const cagatay = all.find((u) => u.email === CAGATAY_EMAIL) || all.find((u) => u.handle === "hyperliquid");
  if (demos.length === 0) throw new Error("no demo users — run seed-demo.mjs first");
  if (!cagatay) throw new Error("Çağatay (hyperliquid) not found");

  const demoIds = demos.map((d) => d.id);

  console.log("Clearing previous demo social activity…");
  await q(`DELETE FROM comments WHERE author_id = ANY($1)`, [demoIds]);
  await q(`DELETE FROM likes   WHERE user_id   = ANY($1)`, [demoIds]);

  const stagger = "now() - (floor(random()*4320)::int * interval '1 minute')"; // up to ~3 days ago

  // ── LIKES ──
  let likeCount = 0;
  for (const d of demos) {
    // everyone likes Çağatay
    await q(
      `INSERT INTO likes (user_id, portfolio_user_id, created_at) VALUES ($1,$2,${stagger})
       ON CONFLICT DO NOTHING`,
      [d.id, cagatay.id],
    );
    likeCount++;
    // plus a handful of random others (not self, not Çağatay again)
    const others = shuffle(all.filter((u) => u.id !== d.id && u.id !== cagatay.id)).slice(0, 3 + Math.floor(Math.random() * 4));
    for (const o of others) {
      await q(
        `INSERT INTO likes (user_id, portfolio_user_id, created_at) VALUES ($1,$2,${stagger})
         ON CONFLICT DO NOTHING`,
        [d.id, o.id],
      );
      likeCount++;
    }
  }

  // ── COMMENTS ──
  let commentCount = 0;
  const addComment = async (authorId, targetId, body) => {
    await q(
      `INSERT INTO comments (author_id, portfolio_user_id, body, created_at) VALUES ($1,$2,$3,${stagger})`,
      [authorId, targetId, body],
    );
    commentCount++;
  };

  // most demo users comment on Çağatay, distinct lines
  const lines = shuffle(CAGATAY);
  const authors = shuffle(demos).slice(0, Math.min(CAGATAY.length, 11));
  for (let i = 0; i < authors.length; i++) {
    await addComment(authors[i].id, cagatay.id, lines[i]);
  }

  // cross-arena chatter: each demo target gets 1-2 comments from other demos
  for (const target of demos) {
    const n = 1 + Math.floor(Math.random() * 2);
    const commenters = shuffle(demos.filter((d) => d.id !== target.id)).slice(0, n);
    for (const c of commenters) await addComment(c.id, target.id, pick(GENERIC));
  }

  // a few demo comments on real users too (realism, light)
  const realTargets = shuffle(all.filter((u) => !u.email.endsWith("@arena.demo") && u.id !== cagatay.id)).slice(0, 4);
  for (const rt of realTargets) {
    await addComment(pick(demos).id, rt.id, pick(GENERIC));
  }

  await pool.end();
  console.log(`Done — ${likeCount} likes, ${commentCount} comments. Çağatay liked by all ${demos.length} demo users.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
