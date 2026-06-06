// ─────────────────────────────────────────────────────────────
// Portfolio engine — valuation + trade rules.
// All money is virtual TRY. Mechanics:
//   • 1,000,000 TL starting balance
//   • max 5 distinct holdings
//   • max 5 trades per calendar day (Europe/Istanbul)
// ─────────────────────────────────────────────────────────────

import { db } from "@/lib/db";
import {
  holdings,
  trades,
  users,
  follows,
  likes,
  comments,
  portfolioSnapshots,
} from "@/db/schema";
import { and, eq, gte, sql, desc, asc } from "drizzle-orm";
import { getLivePrices, getFreshPrices } from "@/lib/prices";
import { ASSET_BY_TICKER } from "@/lib/assets";
import {
  settleAndValuePositions,
  type PositionView,
} from "@/lib/positions";
import { positions as positionsTable } from "@/db/schema";

export const MAX_HOLDINGS = 10;
export const MAX_TRADES_PER_DAY = 10;
/**
 * Execution spread. Now 0 — crypto is priced from Binance in near real-time,
 * so front-running a stale price isn't profitable and no slippage is needed.
 * Still env-tunable if a spread is ever wanted again.
 */
export const EXEC_SPREAD = Number(process.env.TRADE_SPREAD ?? 0);

export interface HoldingView {
  ticker: string;
  name: string;
  type: string;
  quantity: number;
  avgBuyPriceTry: number;
  priceTry: number;
  /** Current price in the asset's native currency (USD / TRY / points). */
  priceNative: number;
  /** Average buy price in the asset's native currency. */
  avgBuyPriceNative: number;
  /** "USD" | "TRY" | index ccy — drives display formatting. */
  nativeCcy: string;
  valueTry: number;
  costTry: number;
  pnlTry: number;
  pnlPct: number;
  weight: number; // of invested + cash total
  color: string;
}

export interface PortfolioView {
  cashTry: number;
  startingTry: number;
  investedTry: number;
  /** total equity tied up in open leveraged positions (margin + live P&L) */
  positionsEquityTry: number;
  totalTry: number;
  totalPnlTry: number;
  totalReturnPct: number;
  holdings: HoldingView[];
  positions: PositionView[];
  equity: number[];
  tradesToday: number;
  tradesLeft: number;
  pricedAt: number;
  usdTry: number;
}

/** Start of today in Istanbul, as a Date (UTC instant). */
export function startOfTodayIstanbul(): Date {
  const now = new Date();
  // Istanbul is UTC+3 year-round (no DST since 2016).
  const ist = new Date(now.getTime() + 3 * 3600_000);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - 3 * 3600_000);
}

export async function countTradesToday(userId: string): Promise<number> {
  const since = startOfTodayIstanbul();
  const rows = await db
    .select({ id: trades.id })
    .from(trades)
    .where(and(eq(trades.userId, userId), gte(trades.tradedAt, since)));
  return rows.length;
}

/** Build the full valued portfolio for a user. */
export async function getPortfolio(userId: string): Promise<PortfolioView> {
  const [[user], rows, snap, tradesToday, equity] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).limit(1),
    db.select().from(holdings).where(eq(holdings.userId, userId)),
    getLivePrices(),
    countTradesToday(userId),
    getEquityCurve(userId),
  ]);

  if (!user) throw new Error("user not found");

  const cashTry = Number(user.cashBalanceTry);
  const startingTry = Number(user.startingBalanceTry);

  const valued = rows.map((h) => {
    const ticker = h.assetId;
    const meta = ASSET_BY_TICKER[ticker];
    const lp = snap.prices[ticker];
    const quantity = Number(h.quantity);
    const avgBuyPriceTry = Number(h.avgBuyPriceTry);
    const priceTry = lp?.priceTry ?? avgBuyPriceTry;
    // native currency + prices for natural display (USD/TRY/points)
    const nativeCcy =
      lp?.nativeCcy ?? (h.assetType === "bist100" ? "TRY" : "USD");
    // TRY→native ratio implied by this asset right now (1/usdTry for USD assets)
    const ratio = lp && lp.priceTry > 0 ? lp.nativePrice / lp.priceTry : 0;
    const priceNative = lp?.nativePrice ?? avgBuyPriceTry * (ratio || 1);
    const avgBuyPriceNative =
      h.avgBuyPriceNative != null
        ? Number(h.avgBuyPriceNative)
        : avgBuyPriceTry * (ratio || (snap.usdTry > 0 ? 1 / snap.usdTry : 1));
    const valueTry = quantity * priceTry;
    const costTry = quantity * avgBuyPriceTry;
    const pnlTry = valueTry - costTry;
    return {
      ticker,
      name: h.name,
      type: h.assetType as string,
      quantity,
      avgBuyPriceTry,
      priceTry,
      priceNative,
      avgBuyPriceNative,
      nativeCcy,
      valueTry,
      costTry,
      pnlTry,
      pnlPct: costTry > 0 ? (pnlTry / costTry) * 100 : 0,
      color: meta?.color ?? "#888",
    };
  });

  const investedTry = valued.reduce((s, h) => s + h.valueTry, 0);

  // Leveraged futures: live-value open positions (auto-liquidating crossed ones).
  const { positions: positionViews, equityTry: positionsEquityTry } =
    await settleAndValuePositions(userId, snap);

  const totalTry = cashTry + investedTry + positionsEquityTry;

  const holdingViews: HoldingView[] = valued
    .map((h) => ({ ...h, weight: totalTry > 0 ? h.valueTry / totalTry : 0 }))
    .sort((a, b) => b.valueTry - a.valueTry);

  await maybeSnapshot(userId, totalTry).catch(() => {});

  return {
    cashTry,
    startingTry,
    investedTry,
    positionsEquityTry,
    totalTry,
    totalPnlTry: totalTry - startingTry,
    totalReturnPct: startingTry > 0 ? ((totalTry - startingTry) / startingTry) * 100 : 0,
    holdings: holdingViews,
    positions: positionViews,
    // historical snapshots + a live "now" point; ensure at least 2 points
    equity: equity.length ? [...equity, totalTry] : [startingTry, totalTry],
    tradesToday,
    tradesLeft: Math.max(0, MAX_TRADES_PER_DAY - tradesToday),
    pricedAt: snap.fetchedAt,
    usdTry: snap.usdTry,
  };
}

/** Record a point on the user's equity curve (real history). */
export async function recordSnapshot(userId: string, valueTry: number) {
  await db
    .insert(portfolioSnapshots)
    .values({ userId, valueTry: String(valueTry) });
}

/** Throttled snapshot — at most one per `minGapMs`. */
export async function maybeSnapshot(
  userId: string,
  valueTry: number,
  minGapMs = 30 * 60_000,
) {
  const [last] = await db
    .select({ takenAt: portfolioSnapshots.takenAt })
    .from(portfolioSnapshots)
    .where(eq(portfolioSnapshots.userId, userId))
    .orderBy(desc(portfolioSnapshots.takenAt))
    .limit(1);
  if (!last || Date.now() - new Date(last.takenAt).getTime() > minGapMs) {
    await recordSnapshot(userId, valueTry);
  }
}

/**
 * Snapshot every user's current total value (cash + spot + open positions).
 * Driven by the daily cron so period leaderboards have real history even for
 * users who didn't open the app. Returns how many rows were written.
 */
export async function snapshotAllUsers(): Promise<number> {
  const rows = await getLeaderboard();
  if (rows.length === 0) return 0;
  await db.insert(portfolioSnapshots).values(
    rows.map((r) => ({ userId: r.id, valueTry: String(r.totalTry) })),
  );
  return rows.length;
}

/** Equity curve (chronological TRY values) for sparklines/charts. */
export async function getEquityCurve(userId: string): Promise<number[]> {
  const rows = await db
    .select({ v: portfolioSnapshots.valueTry })
    .from(portfolioSnapshots)
    .where(eq(portfolioSnapshots.userId, userId))
    .orderBy(asc(portfolioSnapshots.takenAt))
    .limit(200);
  return rows.map((r) => Number(r.v));
}

// ─── Leaderboard ───
export interface LeaderSlice {
  ticker: string;
  name: string;
  color: string;
  weight: number;
  valueTry: number;
}
export interface LeaderRow {
  id: string;
  name: string;
  handle: string;
  image: string | null;
  totalTry: number;
  returnPct: number;
  /** period returns (%) from value snapshots; fall back to since-inception */
  dailyPct: number;
  weeklyPct: number;
  monthlyPct: number;
  quarterlyPct: number;
  cashTry: number;
  holdingsCount: number;
  slices: LeaderSlice[];
  followers: number;
  likes: number;
  tradesCount: number;
}

// ── Leaderboard cache ──
// getLeaderboard is the heaviest read (values every user live). It's called
// from the arena API, the homepage (brief + rail), profile rank, OG images and
// the cron. A short in-memory cache + inflight dedup collapses all of these
// into a single computation per window. Totals already move on the 30s price
// cache and the arena refreshes every 60s, so ~15s staleness is invisible.
const LEADERBOARD_TTL = Number(process.env.LEADERBOARD_TTL_MS ?? 15_000);
let lbCache: { rows: LeaderRow[]; at: number } | null = null;
let lbInflight: Promise<LeaderRow[]> | null = null;

/** Value every registered user with live prices and rank them (cached). */
export async function getLeaderboard(): Promise<LeaderRow[]> {
  if (lbCache && Date.now() - lbCache.at < LEADERBOARD_TTL) return lbCache.rows;
  if (lbInflight) return lbInflight;
  lbInflight = computeLeaderboard()
    .then((rows) => {
      lbCache = { rows, at: Date.now() };
      return rows;
    })
    .finally(() => {
      lbInflight = null;
    });
  return lbInflight;
}

async function computeLeaderboard(): Promise<LeaderRow[]> {
  const [allUsers, allHoldings, openPositions, snap, followCounts, likeCounts, tradeCounts, snapHistory] =
    await Promise.all([
      db.select().from(users),
      db.select().from(holdings),
      db
        .select()
        .from(positionsTable)
        .where(eq(positionsTable.status, "open")),
      getLivePrices(),
      db
        .select({ id: follows.followingId, c: sql<number>`count(*)::int` })
        .from(follows)
        .groupBy(follows.followingId),
      db
        .select({ id: likes.portfolioUserId, c: sql<number>`count(*)::int` })
        .from(likes)
        .groupBy(likes.portfolioUserId),
      db
        .select({ id: trades.userId, c: sql<number>`count(*)::int` })
        .from(trades)
        .groupBy(trades.userId),
      // value history for period returns (only need ~last 100 days)
      db
        .select({
          userId: portfolioSnapshots.userId,
          v: portfolioSnapshots.valueTry,
          t: portfolioSnapshots.takenAt,
        })
        .from(portfolioSnapshots)
        .where(gte(portfolioSnapshots.takenAt, new Date(Date.now() - 100 * 86400_000)))
        .orderBy(asc(portfolioSnapshots.takenAt)),
    ]);

  const fMap = new Map(followCounts.map((r) => [r.id, Number(r.c)]));
  const lMap = new Map(likeCounts.map((r) => [r.id, Number(r.c)]));
  const tMap = new Map(tradeCounts.map((r) => [r.id, Number(r.c)]));

  // Group snapshots per user (ascending) for period-return baselines.
  const snapsByUser = new Map<string, { v: number; t: number }[]>();
  for (const s of snapHistory) {
    const arr = snapsByUser.get(s.userId) ?? [];
    arr.push({ v: Number(s.v), t: new Date(s.t).getTime() });
    snapsByUser.set(s.userId, arr);
  }
  const now = Date.now();
  /**
   * Latest snapshot value at-or-before the cutoff. Returns null when the
   * account is younger than the period (no snapshot that far back) so the
   * caller falls back to the 1M starting balance — period returns are always
   * measured from the competition/purchase start, never inflated by a later
   * mid-life snapshot.
   */
  const baselineAt = (snaps: { v: number; t: number }[] | undefined, cutoff: number) => {
    if (!snaps || snaps.length === 0) return null;
    let base: number | null = null;
    for (const s of snaps) {
      if (s.t <= cutoff) base = s.v;
      else break;
    }
    return base; // null → younger than period → since-start baseline
  };
  const pctSince = (total: number, base: number | null, fallbackBase: number) => {
    const b = base ?? fallbackBase;
    return b > 0 ? ((total - b) / b) * 100 : 0;
  };

  // Live equity from open leveraged positions, per user (crossed → liquidated → 0).
  const posEquity = new Map<string, number>();
  const posSlicesByUser = new Map<string, LeaderSlice[]>();
  for (const p of openPositions) {
    const price = snap.prices[p.assetId]?.priceTry ?? Number(p.entryPriceTry);
    const entry = Number(p.entryPriceTry);
    const qty = Number(p.quantity);
    const margin = Number(p.marginTry);
    const liq = Number(p.liquidationPriceTry);
    const crossed = p.side === "long" ? price <= liq : price >= liq;
    let pnl = (price - entry) * qty * (p.side === "long" ? 1 : -1);
    if (crossed || pnl <= -margin) continue; // liquidated, no equity
    if (pnl < -margin) pnl = -margin;
    const equity = margin + pnl;
    posEquity.set(p.userId, (posEquity.get(p.userId) ?? 0) + equity);
    // a pie slice for this position (equity), labelled e.g. "BTC S6x"
    const arr = posSlicesByUser.get(p.userId) ?? [];
    arr.push({
      ticker: `${p.assetId} ${p.side === "long" ? "L" : "S"}${p.leverage}x`,
      name: p.name,
      color: ASSET_BY_TICKER[p.assetId]?.color ?? "#888",
      weight: 0,
      valueTry: equity,
    });
    posSlicesByUser.set(p.userId, arr);
  }

  const byUser = new Map<string, typeof allHoldings>();
  for (const h of allHoldings) {
    const arr = byUser.get(h.userId) ?? [];
    arr.push(h);
    byUser.set(h.userId, arr);
  }

  const rows: LeaderRow[] = allUsers.map((u) => {
    const cashTry = Number(u.cashBalanceTry);
    const startingTry = Number(u.startingBalanceTry);
    const hs = byUser.get(u.id) ?? [];
    const valued = hs.map((h) => {
      const ticker = h.assetId;
      const meta = ASSET_BY_TICKER[ticker];
      const qty = Number(h.quantity);
      const priceTry = snap.prices[ticker]?.priceTry ?? Number(h.avgBuyPriceTry);
      return { ticker, name: h.name, color: meta?.color ?? "#888", valueTry: qty * priceTry };
    });
    const invested = valued.reduce((s, v) => s + v.valueTry, 0);
    const totalTry = cashTry + invested + (posEquity.get(u.id) ?? 0);
    const posSl = (posSlicesByUser.get(u.id) ?? []).map((s) => ({ ticker: s.ticker, name: s.name, color: s.color, valueTry: s.valueTry }));
    const slices: LeaderSlice[] = [...valued, ...posSl]
      .map((v) => ({ ...v, weight: totalTry > 0 ? v.valueTry / totalTry : 0 }))
      .sort((a, b) => b.valueTry - a.valueTry);
    const snaps = snapsByUser.get(u.id);
    return {
      id: u.id,
      name: u.name,
      handle: u.handle,
      image: u.image,
      totalTry,
      returnPct: startingTry > 0 ? ((totalTry - startingTry) / startingTry) * 100 : 0,
      dailyPct: pctSince(totalTry, baselineAt(snaps, now - 1 * 86400_000), startingTry),
      weeklyPct: pctSince(totalTry, baselineAt(snaps, now - 7 * 86400_000), startingTry),
      monthlyPct: pctSince(totalTry, baselineAt(snaps, now - 30 * 86400_000), startingTry),
      quarterlyPct: pctSince(totalTry, baselineAt(snaps, now - 90 * 86400_000), startingTry),
      cashTry,
      holdingsCount: hs.length,
      slices,
      followers: fMap.get(u.id) ?? 0,
      likes: lMap.get(u.id) ?? 0,
      tradesCount: tMap.get(u.id) ?? 0,
    };
  });

  rows.sort((a, b) => b.totalTry - a.totalTry);
  return rows;
}

// ─── Public profile ───
export interface PublicProfile {
  id: string;
  name: string;
  handle: string;
  image: string | null;
  bio: string | null;
  rank: number;
  totalTry: number;
  returnPct: number;
  cashTry: number;
  investedTry: number;
  holdings: HoldingView[];
  positions: PositionView[];
  equity: number[];
  followers: number;
  likes: number;
  commentsCount: number;
  tradesCount: number;
  isFollowing: boolean;
  isLiked: boolean;
  isSelf: boolean;
  recentTrades: PublicTrade[];
  usdTry: number;
}

export interface PublicTrade {
  ticker: string;
  side: "buy" | "sell";
  quantity: number;
  priceNative: number;
  nativeCcy: string;
  amountTry: number;
  tradedAt: string;
}

export async function getPublicProfile(
  handle: string,
  viewerId: string | null,
): Promise<PublicProfile | null> {
  const [user] = await db.select().from(users).where(eq(users.handle, handle)).limit(1);
  if (!user) return null;

  const [view, equity, board, fc, lc, cc, tc, vf, vl, tradeRows, snap] = await Promise.all([
    getPortfolio(user.id),
    getEquityCurve(user.id),
    getLeaderboard(),
    db.select({ c: sql<number>`count(*)::int` }).from(follows).where(eq(follows.followingId, user.id)),
    db.select({ c: sql<number>`count(*)::int` }).from(likes).where(eq(likes.portfolioUserId, user.id)),
    db.select({ c: sql<number>`count(*)::int` }).from(comments).where(eq(comments.portfolioUserId, user.id)),
    db.select({ c: sql<number>`count(*)::int` }).from(trades).where(eq(trades.userId, user.id)),
    viewerId
      ? db.select().from(follows).where(and(eq(follows.followerId, viewerId), eq(follows.followingId, user.id))).limit(1)
      : Promise.resolve([]),
    viewerId
      ? db.select().from(likes).where(and(eq(likes.userId, viewerId), eq(likes.portfolioUserId, user.id))).limit(1)
      : Promise.resolve([]),
    db.select().from(trades).where(eq(trades.userId, user.id)).orderBy(desc(trades.tradedAt)).limit(15),
    getLivePrices(),
  ]);

  const rank = board.findIndex((r) => r.id === user.id) + 1;

  const recentTrades: PublicTrade[] = tradeRows.map((t) => {
    const lp = snap.prices[t.assetId];
    const priceTry = Number(t.priceTry);
    const nativeCcy = lp?.nativeCcy ?? (t.assetType === "bist100" ? "TRY" : "USD");
    const ratio = lp && lp.priceTry > 0 ? lp.nativePrice / lp.priceTry : snap.usdTry > 0 ? 1 / snap.usdTry : 1;
    return {
      ticker: t.assetId,
      side: t.side as "buy" | "sell",
      quantity: Number(t.quantity),
      priceNative: priceTry * ratio,
      nativeCcy,
      amountTry: Number(t.amountTry),
      tradedAt: (t.tradedAt as Date).toISOString(),
    };
  });

  return {
    id: user.id,
    name: user.name,
    handle: user.handle,
    image: user.image,
    bio: user.bio,
    rank: rank || board.length,
    totalTry: view.totalTry,
    returnPct: view.totalReturnPct,
    cashTry: view.cashTry,
    investedTry: view.investedTry,
    holdings: view.holdings,
    positions: view.positions,
    equity,
    followers: Number(fc[0]?.c ?? 0),
    likes: Number(lc[0]?.c ?? 0),
    commentsCount: Number(cc[0]?.c ?? 0),
    tradesCount: Number(tc[0]?.c ?? 0),
    isFollowing: vf.length > 0,
    isLiked: vl.length > 0,
    isSelf: viewerId === user.id,
    recentTrades,
    usdTry: snap.usdTry,
  };
}

export interface TradeInput {
  ticker: string;
  side: "buy" | "sell";
  /** Provide either amountTry (preferred for buys) or quantity. */
  amountTry?: number;
  quantity?: number;
}

export interface TradeResult {
  ok: boolean;
  error?: string;
  trade?: {
    ticker: string;
    side: "buy" | "sell";
    quantity: number;
    priceTry: number;
    amountTry: number;
    realizedPnlTry: number | null;
  };
}

/**
 * Execute a buy/sell with all rules enforced inside a DB transaction.
 * Returns a structured error string (Turkish, user-facing) on rejection.
 */
export async function executeTrade(
  userId: string,
  input: TradeInput,
): Promise<TradeResult> {
  const meta = ASSET_BY_TICKER[input.ticker];
  if (!meta) return { ok: false, error: "Geçersiz varlık." };
  if (input.side !== "buy" && input.side !== "sell")
    return { ok: false, error: "Geçersiz işlem yönü." };
  // delisted assets can still be sold by existing holders, but not bought
  if (meta.archived && input.side === "buy")
    return { ok: false, error: "Bu varlık artık listede değil; yalnızca satabilirsin." };

  // Freshest data at fill time (anti front-running), then apply the spread:
  // buys fill above mid, sells below mid.
  const snap = await getFreshPrices();
  const live = snap.prices[input.ticker];
  if (!live || !(live.priceTry > 0))
    return { ok: false, error: "Bu varlık için anlık fiyat alınamadı, tekrar dene." };
  const mid = live.priceTry;
  const priceTry = input.side === "buy" ? mid * (1 + EXEC_SPREAD) : mid * (1 - EXEC_SPREAD);
  // native cost basis (USD for crypto/US/commodity, TRY for BIST, points for index)
  const midNative = live.nativePrice > 0 ? live.nativePrice : mid / (snap.usdTry || 1);
  const priceNative = midNative * (priceTry / mid);

  return db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) return { ok: false, error: "Kullanıcı bulunamadı." };

    // Daily trade cap
    const since = startOfTodayIstanbul();
    const todays = await tx
      .select({ id: trades.id })
      .from(trades)
      .where(and(eq(trades.userId, userId), gte(trades.tradedAt, since)));
    if (todays.length >= MAX_TRADES_PER_DAY)
      return {
        ok: false,
        error: `Günlük ${MAX_TRADES_PER_DAY} işlem hakkını doldurdun. Yarın tekrar dene.`,
      };

    const userHoldings = await tx
      .select()
      .from(holdings)
      .where(eq(holdings.userId, userId));
    const existing = userHoldings.find((h) => h.assetId === input.ticker);

    let cash = Number(user.cashBalanceTry);

    if (input.side === "buy") {
      // resolve quantity / amount
      let amount = input.amountTry ?? 0;
      if (!amount && input.quantity) amount = input.quantity * priceTry;
      if (!(amount > 0)) return { ok: false, error: "Geçerli bir tutar gir." };
      // round to 2 kuruş
      amount = Math.round(amount * 100) / 100;
      if (amount > cash + 1e-6)
        return { ok: false, error: "Yetersiz nakit bakiye." };

      if (!existing && userHoldings.length >= MAX_HOLDINGS)
        return {
          ok: false,
          error: `En fazla ${MAX_HOLDINGS} varlık tutabilirsin. Yeni varlık için önce birini sat.`,
        };

      const qty = amount / priceTry;
      cash -= amount;

      if (existing) {
        const oldQty = Number(existing.quantity);
        const oldAvg = Number(existing.avgBuyPriceTry);
        const oldAvgNative =
          existing.avgBuyPriceNative != null
            ? Number(existing.avgBuyPriceNative)
            : oldAvg / (snap.usdTry || 1); // legacy fallback
        const newQty = oldQty + qty;
        const newAvg = (oldQty * oldAvg + qty * priceTry) / newQty;
        const newAvgNative = (oldQty * oldAvgNative + qty * priceNative) / newQty;
        await tx
          .update(holdings)
          .set({
            quantity: String(newQty),
            avgBuyPriceTry: String(newAvg),
            avgBuyPriceNative: String(newAvgNative),
            updatedAt: new Date(),
          })
          .where(eq(holdings.id, existing.id));
      } else {
        await tx.insert(holdings).values({
          userId,
          assetId: input.ticker,
          assetType: meta.type,
          symbol: meta.symbol ?? input.ticker,
          name: meta.name,
          quantity: String(qty),
          avgBuyPriceTry: String(priceTry),
          avgBuyPriceNative: String(priceNative),
        });
      }

      await tx
        .update(users)
        .set({ cashBalanceTry: String(cash), updatedAt: new Date() })
        .where(eq(users.id, userId));

      await tx.insert(trades).values({
        userId,
        assetId: input.ticker,
        assetType: meta.type,
        symbol: meta.symbol ?? input.ticker,
        name: meta.name,
        side: "buy",
        quantity: String(qty),
        priceTry: String(priceTry),
        amountTry: String(amount),
      });

      return {
        ok: true,
        trade: { ticker: input.ticker, side: "buy", quantity: qty, priceTry, amountTry: amount, realizedPnlTry: null },
      };
    }

    // ─── SELL ───
    if (!existing) return { ok: false, error: "Bu varlığa sahip değilsin." };
    const heldQty = Number(existing.quantity);
    let qty = input.quantity ?? 0;
    if (!qty && input.amountTry) qty = input.amountTry / priceTry;
    if (!(qty > 0)) return { ok: false, error: "Geçerli bir miktar gir." };
    // allow tiny float slack for "sell all"
    if (qty > heldQty * (1 + 1e-9)) qty = heldQty;

    const amount = Math.round(qty * priceTry * 100) / 100;
    const avg = Number(existing.avgBuyPriceTry);
    const realized = qty * (priceTry - avg);
    cash += amount;

    const remaining = heldQty - qty;
    if (remaining <= 1e-9) {
      await tx.delete(holdings).where(eq(holdings.id, existing.id));
    } else {
      await tx
        .update(holdings)
        .set({ quantity: String(remaining), updatedAt: new Date() })
        .where(eq(holdings.id, existing.id));
    }

    await tx
      .update(users)
      .set({ cashBalanceTry: String(cash), updatedAt: new Date() })
      .where(eq(users.id, userId));

    await tx.insert(trades).values({
      userId,
      assetId: input.ticker,
      assetType: meta.type,
      symbol: meta.symbol ?? input.ticker,
      name: meta.name,
      side: "sell",
      quantity: String(qty),
      priceTry: String(priceTry),
      amountTry: String(amount),
      realizedPnlTry: String(realized),
    });

    return {
      ok: true,
      trade: { ticker: input.ticker, side: "sell", quantity: qty, priceTry, amountTry: amount, realizedPnlTry: realized },
    };
  });
}
