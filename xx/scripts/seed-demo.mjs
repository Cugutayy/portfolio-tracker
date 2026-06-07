// ─────────────────────────────────────────────────────────────
// Seed 15 demo arena users with mixed spot baskets + leveraged
// long/short positions, real free profile photos (Lorem Picsum).
// Idempotent: wipes existing *@arena.demo users first (FK cascade).
//
// Run:  set -a; . ./.env.local; set +a; node scripts/seed-demo.mjs
// ─────────────────────────────────────────────────────────────
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { randomUUID } from "node:crypto";

neonConfig.webSocketConstructor = ws;

const PRICES_URL = "https://xx-arena.vercel.app/api/prices";
const START = 1_000_000;

// ── asset pool: [ticker, symbol, name] ──
const CRYPTO = [
  ["BTC", "bitcoin", "Bitcoin"], ["ETH", "ethereum", "Ethereum"],
  ["SOL", "solana", "Solana"], ["XRP", "ripple", "XRP"],
  ["BNB", "binancecoin", "BNB"], ["DOGE", "dogecoin", "Dogecoin"],
  ["AVAX", "avalanche-2", "Avalanche"], ["LINK", "chainlink", "Chainlink"],
  ["ADA", "cardano", "Cardano"],
];
const BIST = [
  ["THYAO", "THYAO.IS", "Türk Hava Yolları"], ["GARAN", "GARAN.IS", "Garanti BBVA"],
  ["ASELS", "ASELS.IS", "Aselsan"], ["SISE", "SISE.IS", "Şişecam"],
  ["EREGL", "EREGL.IS", "Ereğli Demir Çelik"], ["TUPRS", "TUPRS.IS", "Tüpraş"],
  ["BIMAS", "BIMAS.IS", "BİM"], ["KCHOL", "KCHOL.IS", "Koç Holding"],
  ["FROTO", "FROTO.IS", "Ford Otosan"], ["SASA", "SASA.IS", "Sasa Polyester"],
  ["AKBNK", "AKBNK.IS", "Akbank"], ["TCELL", "TCELL.IS", "Turkcell"],
];
const US = [
  ["AAPL", "AAPL", "Apple"], ["NVDA", "NVDA", "NVIDIA"], ["TSLA", "TSLA", "Tesla"],
  ["MSFT", "MSFT", "Microsoft"], ["AMZN", "AMZN", "Amazon"], ["META", "META", "Meta"],
  ["GOOGL", "GOOGL", "Alphabet"],
];
const INDEX = [
  ["BIST100", "XU100.IS", "BIST 100"], ["NASDAQ", "^NDX", "NASDAQ 100"],
  ["S&P500", "^GSPC", "S&P 500"],
];

const TYPE = new Map();
for (const [t] of CRYPTO) TYPE.set(t, "crypto");
for (const [t] of BIST) TYPE.set(t, "bist100");
for (const [t] of US) TYPE.set(t, "nasdaq100");
for (const [t] of INDEX) TYPE.set(t, "index");

const SYMBOL = new Map(),
  NAME = new Map();
for (const [t, s, n] of [...CRYPTO, ...BIST, ...US, ...INDEX]) {
  SYMBOL.set(t, s);
  NAME.set(t, n);
}

// spot universe (everything) + leverage universe (crypto + index + BIST30 only)
const SPOT_POOL = [...CRYPTO, ...BIST, ...US, ...INDEX].map((r) => r[0]);
const LEV_POOL = [...CRYPTO, ...BIST, ...INDEX].map((r) => r[0]);

// ── 60 personas: [name, handle, gender] — gender matches the profile photo ──
const NAMES = [
  ["Mert Demir", "mert_demir", "m"], ["Elif Yılmaz", "elif_yilmaz", "f"],
  ["Can Kaya", "can_kaya", "m"], ["Zeynep Şahin", "zeynep_sahin", "f"],
  ["Emre Çelik", "emre_celik", "m"], ["Selin Arslan", "selin_arslan", "f"],
  ["Burak Doğan", "burak_dogan", "m"], ["Ayşe Koç", "ayse_koc", "f"],
  ["Kerem Aydın", "kerem_aydin", "m"], ["Deniz Yıldız", "deniz_yildiz", "m"],
  ["Ozan Aksoy", "ozan_aksoy", "m"], ["Ece Polat", "ece_polat", "f"],
  ["Tolga Erdoğan", "tolga_erdogan", "m"], ["Cem Öztürk", "cem_ozturk", "m"],
  ["Gizem Acar", "gizem_acar", "f"], ["Ahmet Yıldırım", "ahmet_yildirim", "m"],
  ["Mehmet Şahin", "mehmet_sahin", "m"], ["Ali Koç", "ali_koc", "m"],
  ["Hasan Kurt", "hasan_kurt", "m"], ["Hüseyin Arslan", "huseyin_arslan", "m"],
  ["İbrahim Çelik", "ibrahim_celik", "m"], ["Murat Polat", "murat_polat", "m"],
  ["Yusuf Aydın", "yusuf_aydin", "m"], ["Oğuz Çetin", "oguz_cetin", "m"],
  ["Barış Şen", "baris_sen", "m"], ["Serkan Acar", "serkan_acar", "m"],
  ["Volkan Kara", "volkan_kara", "m"], ["Onur Güneş", "onur_gunes", "m"],
  ["Furkan Aslan", "furkan_aslan", "m"], ["Berk Yalçın", "berk_yalcin", "m"],
  ["Kaan Şimşek", "kaan_simsek", "m"], ["Eren Yıldız", "eren_yildiz", "m"],
  ["Umut Taş", "umut_tas", "m"], ["Sinan Bulut", "sinan_bulut", "m"],
  ["Tarık Erdem", "tarik_erdem", "m"], ["Gökhan Avcı", "gokhan_avci", "m"],
  ["Halil Doğan", "halil_dogan", "m"], ["Selim Kaplan", "selim_kaplan", "m"],
  ["Engin Yavuz", "engin_yavuz", "m"], ["Bora Çakır", "bora_cakir", "m"],
  ["Çağrı Özdemir", "cagri_ozdemir", "m"], ["Doruk Yılmaz", "doruk_yilmaz", "m"],
  ["Arda Demir", "arda_demir", "m"], ["Merve Demir", "merve_demir", "f"],
  ["Büşra Çelik", "busra_celik", "f"], ["Esra Kaya", "esra_kaya", "f"],
  ["Fatma Yıldız", "fatma_yildiz", "f"], ["Hatice Aydın", "hatice_aydin", "f"],
  ["Derya Kurt", "derya_kurt", "f"], ["Sıla Arslan", "sila_arslan", "f"],
  ["İrem Şen", "irem_sen", "f"], ["Beyza Aksoy", "beyza_aksoy", "f"],
  ["Melike Doğan", "melike_dogan", "f"], ["Nazlı Kaya", "nazli_kaya", "f"],
  ["Pınar Yılmaz", "pinar_yilmaz", "f"], ["Cansu Erdoğan", "cansu_erdogan", "f"],
  ["Damla Öztürk", "damla_ozturk", "f"], ["Aslı Korkmaz", "asli_korkmaz", "f"],
  ["Tuğçe Çetin", "tugce_cetin", "f"], ["Yağmur Kara", "yagmur_kara", "f"],
];

// realistic bios — assigned at random; many users leave it blank
const BIOS = [
  "Uzun vadeli yatırımcı.", "Teknoloji hisseleri ağırlıkta.", "Kripto ve endeks dengesi.",
  "Temettü sever.", "BIST takipçisi.", "Riski yöneten trader.", "Kısa vade, hızlı işlem.",
  "Sabırlı portföy.", "Kaldıraçlı işlemler.", "Endeks fonu mantığı.", "Değer yatırımı.",
  "Momentum avcısı.", "Dengeli ve temkinli.", "Borsada 3. yılım.", "Grafik okumayı severim.",
  "Düşüşte alırım.", "Stop'a sadığım.", "Spot ağırlıklı.", "ABD piyasası favorim.",
  "Yeni başladım, öğreniyorum.", "Kahve + grafik.", "Sadece sağlam projeler.",
];

// Procedural archetype per user (from their seeded RNG) → fully varied
// portfolios: asset focus, holding count, leverage usage, cash level. Some
// will coincide — that's fine, real groups overlap too.
function archetypeFor(r) {
  const focus = pick(["mixed", "mixed", "mixed", "crypto", "crypto", "bist", "bist", "us", "index"], r);
  const spot = 2 + Math.floor(r() * 7); // 2..8
  const pr = r();
  const pos = pr < 0.42 ? 0 : pr < 0.72 ? 1 + Math.floor(r() * 2) : 2 + Math.floor(r() * 3); // 0 / 1-2 / 2-4
  const cash = 0.03 + r() * 0.42; // 3%..45%
  const short = pos > 0 && r() < 0.5;
  return { focus, spot, pos, cash, short };
}

const poolFor = (focus) => {
  if (focus === "crypto") return CRYPTO.map((x) => x[0]);
  if (focus === "bist") return BIST.map((x) => x[0]);
  if (focus === "us") return US.map((x) => x[0]);
  if (focus === "index") return INDEX.map((x) => x[0]);
  return SPOT_POOL;
};
const levPoolFor = (focus) => {
  let base = focus === "mixed" ? LEV_POOL : poolFor(focus).filter((t) => LEV_POOL.includes(t));
  if (base.length < 2) base = LEV_POOL; // e.g. US has no leverage → fall back
  return base;
};

// deterministic RNG so reruns are stable
function rng(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (arr, r) => arr[Math.floor(r() * arr.length)];
const shuffle = (arr, r) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");

  console.log("Fetching live prices…");
  const pj = await fetch(PRICES_URL).then((r) => r.json());
  if (!pj.ok) throw new Error("prices fetch failed");
  const P = pj.prices;
  const priced = (t) => P[t] && P[t].priceTry > 0;

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const q = (text, params) => pool.query(text, params);

  console.log("Wiping previous demo users…");
  await q("DELETE FROM users WHERE email LIKE '%@arena.demo'");

  // Real funny pet photos (stable CDN urls) for profile-picture variety.
  const fetchPool = async (url, target) => {
    const out = [];
    for (let i = 0; i < 6 && out.length < target; i++) {
      try {
        const arr = await fetch(url).then((r) => r.json());
        for (const c of arr) if (c.url && !out.includes(c.url)) out.push(c.url);
      } catch {
        /* ignore */
      }
    }
    return out;
  };
  console.log("Fetching pet photos…");
  const catPool = await fetchPool("https://api.thecatapi.com/v1/images/search?limit=10", 18);
  const dogPool = await fetchPool("https://api.thedogapi.com/v1/images/search?limit=10", 18);
  console.log(`  cats: ${catPool.length}, dogs: ${dogPool.length}`);

  let made = 0;
  let catI = 0, dogI = 0;
  for (let uidx = 0; uidx < NAMES.length; uidx++) {
    const [name, handle] = NAMES[uidx];
    const r = rng(handle);
    // a random moment within the last ~3 days (spreads purchase times)
    const someTime = () => new Date(Date.now() - Math.floor(r() * 72 * 3600 * 1000));
    const A = archetypeFor(r);
    const bio = r() < 0.65 ? pick(BIOS, r) : ""; // ~35% leave bio blank
    const id = randomUUID();
    // No generic human portraits — funny cats / dogs / scenery only
    const roll = r();
    let image;
    if (roll < 0.4 && catPool.length) {
      image = catPool[catI++ % catPool.length];
    } else if (roll < 0.72 && dogPool.length) {
      image = dogPool[dogI++ % dogPool.length];
    } else {
      image = `https://picsum.photos/seed/${handle}/400`; // real scenery/objects
    }
    const email = `${handle}@arena.demo`;

    // ── archetype-driven basket: some full-stock, some leverage-heavy ──
    let cash = START;
    const cashKeep = START * A.cash;
    const investable = START - cashKeep;
    const marginShare = A.pos > 0 ? Math.min(0.5, Math.max(0.2, A.pos * 0.12)) * (0.9 + r() * 0.2) : 0;
    const marginBudget = investable * marginShare;
    const spotBudget = investable - marginBudget;

    // spot holdings from the user's focus class
    const focusPool = poolFor(A.focus).filter(priced);
    const spotTk = shuffle(focusPool, r).slice(0, A.spot);
    const holdings = [];
    if (spotTk.length && spotBudget > 0) {
      const w = spotTk.map(() => 0.5 + r());
      const ws = w.reduce((a, b) => a + b, 0);
      spotTk.forEach((t, i) => {
        const amt = spotBudget * (w[i] / ws);
        if (amt < 500) return;
        const priceTry = P[t].priceTry;
        holdings.push({ t, amt, qty: amt / priceTry, priceTry, native: P[t].nativePrice, at: someTime() });
        cash -= amt;
      });
    }

    // leveraged positions (0 for full-stock archetypes)
    const positions = [];
    if (A.pos > 0 && marginBudget > 0) {
      const levPool = levPoolFor(A.focus).filter(priced);
      let tks = shuffle(levPool, r).slice(0, A.pos);
      if (A.force) tks = [...A.force.filter(priced), ...tks]; // pinned tickers (e.g. DOGE)
      if (A.short && priced("BTC") && !tks.includes("BTC")) tks.push("BTC");
      tks = [...new Set(tks)].slice(0, A.pos);
      const w = tks.map(() => 0.5 + r());
      const ws = w.reduce((a, b) => a + b, 0);
      tks.forEach((t, i) => {
        const margin = marginBudget * (w[i] / ws);
        if (margin < 3000) return;
        const lev = 3 + Math.floor(r() * 8); // 3..10
        const forced = A.force && A.force.includes(t);
        const side = forced ? "short" : A.short ? (t === "BTC" ? "short" : r() < 0.6 ? "short" : "long") : r() < 0.5 ? "long" : "short";
        const entry = P[t].priceTry;
        const qty = (margin * lev) / entry;
        const liq = side === "long" ? entry * (1 - 1 / lev) : entry * (1 + 1 / lev);
        positions.push({ t, margin, lev, side, entry, qty, liq, at: someTime() });
        cash -= margin;
      });
    }

    // ── insert user ──
    await q(
      `INSERT INTO users (id, name, handle, email, password_hash, image, bio, cash_balance_try, starting_balance_try)
       VALUES ($1,$2,$3,$4,NULL,$5,$6,$7,$8)`,
      [id, name, handle, email, image, bio, cash.toFixed(4), String(START)],
    );

    for (const h of holdings) {
      await q(
        `INSERT INTO holdings (user_id, asset_id, asset_type, symbol, name, quantity, avg_buy_price_try, avg_buy_price_native, created_at, updated_at)
         VALUES ($1,$2,$3::asset_type,$4,$5,$6,$7,$8,$9,$9)`,
        [id, h.t, TYPE.get(h.t), SYMBOL.get(h.t), NAME.get(h.t), h.qty.toFixed(12), h.priceTry.toFixed(6), String(h.native), h.at],
      );
      // matching spot buy in trade history → feed shows varied purchase times
      await q(
        `INSERT INTO trades (user_id, asset_id, asset_type, symbol, name, side, quantity, price_try, amount_try, traded_at)
         VALUES ($1,$2,$3::asset_type,$4,$5,'buy',$6,$7,$8,$9)`,
        [id, h.t, TYPE.get(h.t), SYMBOL.get(h.t), NAME.get(h.t), h.qty.toFixed(12), h.priceTry.toFixed(6), h.amt.toFixed(4), h.at],
      );
    }

    for (const p of positions) {
      await q(
        `INSERT INTO positions (user_id, asset_id, asset_type, symbol, name, side, leverage, quantity, entry_price_try, margin_try, liquidation_price_try, status, opened_at)
         VALUES ($1,$2,$3::asset_type,$4,$5,$6::position_side,$7,$8,$9,$10,$11,'open',$12)`,
        [id, p.t, TYPE.get(p.t), SYMBOL.get(p.t), NAME.get(p.t), p.side, p.lev, p.qty.toFixed(12), p.entry.toFixed(6), p.margin.toFixed(4), p.liq.toFixed(6), p.at],
      );
    }

    // Anchor the competition start: one snapshot at the 1M starting balance.
    // No fake history — returns are measured from this start (and from each
    // asset's purchase price), so period figures stay honest until the daily
    // cron accrues real history.
    await q(
      `INSERT INTO portfolio_snapshots (user_id, value_try, taken_at)
       VALUES ($1,$2, now() - interval '2 hours')`,
      [id, String(START)],
    );

    made++;
    console.log(`  ✓ ${name.padEnd(22)} spot:${holdings.length} pos:${positions.length} cash:${Math.round(cash).toLocaleString("tr-TR")}`);
  }

  await pool.end();
  console.log(`\nDone — ${made} demo users seeded.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
