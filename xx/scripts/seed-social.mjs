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

// comments aimed at Çağatay's portfolio (grounded, no emoji, no cringe)
const CAGATAY = [
  "short long hepsi var, profesyonel iş",
  "DEÜ İşletme Fakültesi'nin selamı var hocam",
  "bro bu nasıl portföy ya, helal",
  "noluyo burda, adam coşmuş",
  "dağılım çok dengeli olmuş, eline sağlık",
  "BTC short açarken bile soğukkanlısın, saygı",
  "bu portföyü örnek alıyorum açıkçası",
  "kaldıraç yönetimin temiz",
  "abi bana da bir öneri ver",
  "endeks ve kripto dengesi yerinde",
  "girişlerin zamanlaması iyiymiş",
  "bu işi ciddiye almışsın belli",
];

// generic cross-arena comments (teasing + serious, no emoji)
const GENERIC = [
  "BTC short açana saygı duyuyorum",
  "stop koy bi yere kanka",
  "valla tuttu, helal olsun",
  "temettü hisseleri ağırlıkta, mantıklı",
  "dengeli bir portföy olmuş",
  "girişlerin iyi zamanlanmış",
  "bu ne cesaret ya",
  "ayı piyasası gelince konuşuruz",
  "tam boğa olmuşsun",
  "gece gece ne işin var borsada",
  "düşüşten alana selam",
  "portföyü görünce kendiminkinden utandım",
  "panikleme, tut bence",
  "bunu nerden buldun ya",
  "kaldıraç biraz fazla olmamış mı",
  "ben de katılayım mı bu işe",
  "bu coin riskli, dikkat et",
  "erken almışsın, gözün aydın",
  "elin değmişken bana da bakar mısın",
  "bu hisseyi ben de izliyorum",
  "kâr realizasyonu yapmayı unutma",
  "sabır taşı gibisin, helal",
  "bu dağılım gayet sağlam",
  "biraz nakit tutmak iyi fikir",
  "hangi aracı kurumdasın",
  "ortalama maliyetin kaç oldu",
  "ben dünden almıştım, iyi gidiyor",
  "endeks ağırlığını sevdim",
  "kripto tarafı biraz cesur olmuş",
  "uzun vadede bu iş tutar",
  "bugün piyasa sakin, sen ne yaptın",
  "stop yemeden çıkmışsın, tebrikler",
  "fena değil ama çeşitlendir biraz",
  "tahvil gibi sağlam duruyor",
  "bu coin uçar bence, gözüm üstünde",
  "satmadan tut, daha var",
  "ralliyi yakalamışsın",
  "düşüşte soğukkanlı kalmışsın",
  "iyi okumuşsun piyasayı",
  "ben olsam biraz kâr alırdım",
  "grafikte güzel duruyor",
  "kaldıraçsız da güzel kazanılıyor",
  "BIST tarafı iyi seçilmiş",
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
  const emir = all.find((u) => u.handle === "emir_kaan");
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
    // Emir Kaan also gets liked by most demo users (~75%)
    if (emir && Math.random() < 0.75) {
      await q(
        `INSERT INTO likes (user_id, portfolio_user_id, created_at) VALUES ($1,$2,${stagger})
         ON CONFLICT DO NOTHING`,
        [d.id, emir.id],
      );
      likeCount++;
    }
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

  // Emir Kaan gets specific complimentary comments
  if (emir) {
    const lines = shuffle(["dengeli portföy, eline sağlık", "yakışıklı trader", "dengeli ve sağlam portföy, helal"]);
    const au = shuffle(demos).slice(0, lines.length);
    for (let i = 0; i < lines.length; i++) await addComment(au[i].id, emir.id, lines[i]);
  }

  // random subset of real users get comments too (Emir Kaan guaranteed)
  const reals = all.filter((u) => !u.email.endsWith("@arena.demo") && u.id !== cagatay.id);
  const realTargets = shuffle(reals).slice(0, 5);
  if (emir && !realTargets.some((u) => u.id === emir.id)) realTargets.push(emir);
  for (const rt of realTargets) {
    const n = 1 + Math.floor(Math.random() * 2); // 1..2
    const commenters = shuffle(demos).slice(0, n);
    for (const c of commenters) await addComment(c.id, rt.id, pick(GENERIC));
  }

  await pool.end();
  console.log(`Done — ${likeCount} likes, ${commentCount} comments. Çağatay liked by all ${demos.length} demo users.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
