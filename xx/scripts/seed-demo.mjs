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

// ── 15 personas ──
const USERS = [
  ["Boğa Burak", "boga_burak", "Her mum yeşil olacak."],
  ["Ayı Ahmet", "ayi_ahmet", "Short açmadan uyuyamam."],
  ["Kaldıraç Kemal", "kaldirac_kemal", "10x ya da hiç."],
  ["Sabırlı Selin", "sabirli_selin", "Uzun vade kazandırır."],
  ["Pump Pelin", "pump_pelin", "Mum diken alır."],
  ["HODL Hasan", "hodl_hasan", "Satmıyorum, taşıyorum."],
  ["Marj Mert", "marj_mert", "Teminat bende rahat durmaz."],
  ["Panik Pınar", "panik_pinar", "Kırmızı görünce satarım."],
  ["Diamond Deniz", "diamond_deniz", "Elmas eller."],
  ["Balina Volkan", "balina_volkan", "Derinden vururum."],
  ["Stop Süleyman", "stop_suleyman", "Stop'um hep tetiklenir."],
  ["FOMO Furkan", "fomo_furkan", "Tepe noktadan girerim."],
  ["Tilki Tarık", "tilki_tarik", "Wall Street'in kurdu."],
  ["Likidite Lokman", "likidite_lokman", "Nakit kraldır, bazen."],
  ["Gece Bekçisi Gökhan", "gece_gokhan", "ABD seansı benim."],
];

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

  let made = 0;
  for (const [name, handle, bio] of USERS) {
    const r = rng(handle);
    const id = randomUUID();
    const image = `https://picsum.photos/seed/${handle}/256`;
    const email = `${handle}@arena.demo`;

    // ── build basket ──
    let cash = START;
    const spotTickers = shuffle(SPOT_POOL.filter(priced), r).slice(0, 2 + Math.floor(r() * 3)); // 2..4
    const levTickers = shuffle(LEV_POOL.filter(priced), r).slice(0, 1 + Math.floor(r() * 3)); // 1..3

    const holdings = [];
    let spotBudget = 280_000 + Math.floor(r() * 380_000); // 280k..660k
    for (const t of spotTickers) {
      const amt = Math.min(cash * 0.6, spotBudget / spotTickers.length);
      if (amt < 1000) continue;
      const priceTry = P[t].priceTry;
      const qty = amt / priceTry;
      holdings.push({ t, amt, qty, priceTry, native: P[t].nativePrice });
      cash -= amt;
    }

    const positions = [];
    for (const t of levTickers) {
      const margin = 30_000 + Math.floor(r() * 110_000); // 30k..140k
      if (margin > cash * 0.7) continue;
      const lev = 2 + Math.floor(r() * 9); // 2..10
      const side = r() < 0.5 ? "long" : "short";
      const entry = P[t].priceTry;
      const qty = (margin * lev) / entry;
      const liq = side === "long" ? entry * (1 - 1 / lev) : entry * (1 + 1 / lev);
      positions.push({ t, margin, lev, side, entry, qty, liq });
      cash -= margin;
    }

    // ── insert user ──
    await q(
      `INSERT INTO users (id, name, handle, email, password_hash, image, bio, cash_balance_try, starting_balance_try)
       VALUES ($1,$2,$3,$4,NULL,$5,$6,$7,$8)`,
      [id, name, handle, email, image, bio, cash.toFixed(4), String(START)],
    );

    for (const h of holdings) {
      await q(
        `INSERT INTO holdings (user_id, asset_id, asset_type, symbol, name, quantity, avg_buy_price_try, avg_buy_price_native)
         VALUES ($1,$2,$3::asset_type,$4,$5,$6,$7,$8)`,
        [id, h.t, TYPE.get(h.t), SYMBOL.get(h.t), NAME.get(h.t), h.qty.toFixed(12), h.priceTry.toFixed(6), String(h.native)],
      );
    }

    for (const p of positions) {
      await q(
        `INSERT INTO positions (user_id, asset_id, asset_type, symbol, name, side, leverage, quantity, entry_price_try, margin_try, liquidation_price_try, status)
         VALUES ($1,$2,$3::asset_type,$4,$5,$6::position_side,$7,$8,$9,$10,$11,'open')`,
        [id, p.t, TYPE.get(p.t), SYMBOL.get(p.t), NAME.get(p.t), p.side, p.lev, p.qty.toFixed(12), p.entry.toFixed(6), p.margin.toFixed(4), p.liq.toFixed(6)],
      );
    }

    // ── seed history so daily/weekly/monthly returns vary ──
    const v7 = START * (0.86 + r() * 0.22); // 7 days ago
    const v1 = START * (0.92 + r() * 0.18); // 1 day ago
    await q(
      `INSERT INTO portfolio_snapshots (user_id, value_try, taken_at) VALUES
        ($1,$2, now() - interval '7 days'),
        ($1,$3, now() - interval '1 day')`,
      [id, v7.toFixed(4), v1.toFixed(4)],
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
