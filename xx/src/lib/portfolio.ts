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
import { getLivePrices } from "@/lib/prices";
import { ASSET_BY_TICKER } from "@/lib/assets";

export const MAX_HOLDINGS = 5;
export const MAX_TRADES_PER_DAY = 5;

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
  totalTry: number;
  totalPnlTry: number;
  totalReturnPct: number;
  holdings: HoldingView[];
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
  const [[user], rows, snap, tradesToday] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).limit(1),
    db.select().from(holdings).where(eq(holdings.userId, userId)),
    getLivePrices(),
    countTradesToday(userId),
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
  const totalTry = cashTry + investedTry;

  const holdingViews: HoldingView[] = valued
    .map((h) => ({ ...h, weight: totalTry > 0 ? h.valueTry / totalTry : 0 }))
    .sort((a, b) => b.valueTry - a.valueTry);

  await maybeSnapshot(userId, totalTry).catch(() => {});

  return {
    cashTry,
    startingTry,
    investedTry,
    totalTry,
    totalPnlTry: totalTry - startingTry,
    totalReturnPct: startingTry > 0 ? ((totalTry - startingTry) / startingTry) * 100 : 0,
    holdings: holdingViews,
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
  cashTry: number;
  holdingsCount: number;
  slices: LeaderSlice[];
  followers: number;
  likes: number;
  tradesCount: number;
}

/** Value every registered user with live prices and rank them. */
export async function getLeaderboard(): Promise<LeaderRow[]> {
  const [allUsers, allHoldings, snap, followCounts, likeCounts, tradeCounts] =
    await Promise.all([
      db.select().from(users),
      db.select().from(holdings),
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
    ]);

  const fMap = new Map(followCounts.map((r) => [r.id, Number(r.c)]));
  const lMap = new Map(likeCounts.map((r) => [r.id, Number(r.c)]));
  const tMap = new Map(tradeCounts.map((r) => [r.id, Number(r.c)]));

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
    const totalTry = cashTry + invested;
    const slices: LeaderSlice[] = valued
      .map((v) => ({ ...v, weight: totalTry > 0 ? v.valueTry / totalTry : 0 }))
      .sort((a, b) => b.valueTry - a.valueTry);
    return {
      id: u.id,
      name: u.name,
      handle: u.handle,
      image: u.image,
      totalTry,
      returnPct: startingTry > 0 ? ((totalTry - startingTry) / startingTry) * 100 : 0,
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
  equity: number[];
  followers: number;
  likes: number;
  commentsCount: number;
  tradesCount: number;
  isFollowing: boolean;
  isLiked: boolean;
  isSelf: boolean;
}

export async function getPublicProfile(
  handle: string,
  viewerId: string | null,
): Promise<PublicProfile | null> {
  const [user] = await db.select().from(users).where(eq(users.handle, handle)).limit(1);
  if (!user) return null;

  const [view, equity, board, fc, lc, cc, tc, vf, vl] = await Promise.all([
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
  ]);

  const rank = board.findIndex((r) => r.id === user.id) + 1;

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
    equity,
    followers: Number(fc[0]?.c ?? 0),
    likes: Number(lc[0]?.c ?? 0),
    commentsCount: Number(cc[0]?.c ?? 0),
    tradesCount: Number(tc[0]?.c ?? 0),
    isFollowing: vf.length > 0,
    isLiked: vl.length > 0,
    isSelf: viewerId === user.id,
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

  const snap = await getLivePrices();
  const live = snap.prices[input.ticker];
  if (!live || !(live.priceTry > 0))
    return { ok: false, error: "Bu varlık için anlık fiyat alınamadı, tekrar dene." };
  const priceTry = live.priceTry;
  // native cost basis (USD for crypto/US/commodity, TRY for BIST, points for index)
  const priceNative =
    live.nativePrice > 0 ? live.nativePrice : priceTry / (snap.usdTry || 1);

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
