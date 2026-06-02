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

// ── 15 personas (realistic Turkish names) ──
const USERS = [
  ["Mert Demir", "mert_demir", "Uzun vadeli yatırımcı."],
  ["Elif Yılmaz", "elif_yilmaz", "Teknoloji hisseleri ağırlıklı."],
  ["Can Kaya", "can_kaya", "Kripto ve endeks dengesi."],
  ["Zeynep Şahin", "zeynep_sahin", "Temettü ve büyüme."],
  ["Emre Çelik", "emre_celik", "BIST ve global karışık."],
  ["Selin Arslan", "selin_arslan", "Riski seven trader."],
  ["Burak Doğan", "burak_dogan", "Kısa vade, hızlı işlem."],
  ["Ayşe Koç", "ayse_koc", "Sabırlı portföy."],
  ["Kerem Aydın", "kerem_aydin", "Kaldıraçlı işlemler."],
  ["Deniz Yıldız", "deniz_yildiz", "Endeks takipçisi."],
  ["Ozan Aksoy", "ozan_aksoy", "Değer yatırımı."],
  ["Ece Polat", "ece_polat", "Kripto ağırlıklı."],
  ["Tolga Erdoğan", "tolga_erdogan", "Momentum avcısı."],
  ["Cem Öztürk", "cem_ozturk", "Dengeli ve temkinli."],
  ["Gizem Acar", "gizem_acar", "Teknoloji ve enerji."],
];

// Per-user archetype (aligned to USERS order) — drives a *varied* mix:
// focus = asset class · spot = # holdings · pos = # leveraged positions
// (0 = full stock, no futures) · cash = leftover cash fraction · short = BTC short bias
const ARCHETYPES = [
  { focus: "bist", spot: 6, pos: 0, cash: 0.06, short: false }, // Mert — full stock BIST
  { focus: "us", spot: 5, pos: 0, cash: 0.08, short: false }, // Elif — full stock US tech
  { focus: "crypto", spot: 3, pos: 3, cash: 0.10, short: true }, // Can — crypto degen
  { focus: "mixed", spot: 5, pos: 1, cash: 0.22, short: false }, // Zeynep — balanced
  { focus: "mixed", spot: 7, pos: 0, cash: 0.05, short: false }, // Emre — full stock mixed
  { focus: "mixed", spot: 2, pos: 4, cash: 0.20, short: true }, // Selin — leverage heavy
  { focus: "bist", spot: 6, pos: 0, cash: 0.04, short: false }, // Burak — full stock BIST
  { focus: "mixed", spot: 3, pos: 1, cash: 0.40, short: false }, // Ayşe — cash heavy
  { focus: "crypto", spot: 2, pos: 4, cash: 0.15, short: true }, // Kerem — crypto leverage
  { focus: "index", spot: 4, pos: 1, cash: 0.15, short: false }, // Deniz — index focus
  { focus: "bist", spot: 6, pos: 0, cash: 0.07, short: false }, // Ozan — value full stock
  { focus: "crypto", spot: 4, pos: 2, cash: 0.12, short: false }, // Ece — crypto mixed
  { focus: "mixed", spot: 5, pos: 2, cash: 0.10, short: false }, // Tolga — momentum mixed
  { focus: "mixed", spot: 6, pos: 0, cash: 0.18, short: false }, // Cem — balanced full stock
  { focus: "us", spot: 4, pos: 2, cash: 0.12, short: true }, // Gizem — US tech + a BTC short
];

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

  let made = 0;
  for (let uidx = 0; uidx < USERS.length; uidx++) {
    const [name, handle, bio] = USERS[uidx];
    const A = ARCHETYPES[uidx];
    const r = rng(handle);
    const id = randomUUID();
    const image = `https://picsum.photos/seed/${handle}/256`;
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
        holdings.push({ t, amt, qty: amt / priceTry, priceTry, native: P[t].nativePrice });
        cash -= amt;
      });
    }

    // leveraged positions (0 for full-stock archetypes)
    const positions = [];
    if (A.pos > 0 && marginBudget > 0) {
      const levPool = levPoolFor(A.focus).filter(priced);
      let tks = shuffle(levPool, r).slice(0, A.pos);
      if (A.short && priced("BTC") && !tks.includes("BTC")) tks[0] = "BTC";
      tks = [...new Set(tks)];
      const w = tks.map(() => 0.5 + r());
      const ws = w.reduce((a, b) => a + b, 0);
      tks.forEach((t, i) => {
        const margin = marginBudget * (w[i] / ws);
        if (margin < 3000) return;
        const lev = 3 + Math.floor(r() * 8); // 3..10
        const side = A.short ? (t === "BTC" ? "short" : r() < 0.6 ? "short" : "long") : r() < 0.5 ? "long" : "short";
        const entry = P[t].priceTry;
        const qty = (margin * lev) / entry;
        const liq = side === "long" ? entry * (1 - 1 / lev) : entry * (1 + 1 / lev);
        positions.push({ t, margin, lev, side, entry, qty, liq });
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
