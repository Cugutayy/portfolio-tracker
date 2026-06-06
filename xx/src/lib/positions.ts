// ─────────────────────────────────────────────────────────────
// Leveraged futures engine — long/short with margin, liquidation.
// Spot holdings stay in `holdings`; these are separate margin positions
// (crypto + indices/VIOP only). All money is virtual TRY.
// ─────────────────────────────────────────────────────────────

import { db } from "@/lib/db";
import { positions, users } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getLivePrices, getFreshPrices, type PriceSnapshot } from "@/lib/prices";
import { ASSET_BY_TICKER, isLeverageable } from "@/lib/assets";

export const MAX_LEVERAGE = 10;
export const MAX_OPEN_POSITIONS = 10;
// Execution spread — 0 (real-time crypto pricing makes slippage unnecessary).
const EXEC_SPREAD = Number(process.env.TRADE_SPREAD ?? 0);

export interface PositionView {
  id: string;
  ticker: string;
  name: string;
  type: string;
  side: "long" | "short";
  leverage: number;
  quantity: number;
  entryPriceTry: number;
  priceTry: number;
  /** native (USD/₺) for display */
  entryNative: number;
  priceNative: number;
  nativeCcy: string;
  marginTry: number;
  liquidationPriceTry: number;
  pnlTry: number; // live, floored at -margin
  pnlPct: number; // return on margin
  equityTry: number; // margin + pnl (>= 0)
  tpPct: number | null; // take-profit at +tpPct% on margin
  slPct: number | null; // stop-loss at -slPct% on margin
}

export interface PositionInput {
  ticker: string;
  side: "long" | "short";
  leverage: number;
  marginTry: number;
  tpPct?: number | null;
  slPct?: number | null;
}
export interface PositionResult {
  ok: boolean;
  error?: string;
  realizedPnlTry?: number;
}

const err = (error: string): PositionResult => ({ ok: false, error });

/** liquidation price: full margin loss → long ≈ entry·(1−1/L), short ≈ entry·(1+1/L) */
function liqPrice(entry: number, side: "long" | "short", lev: number): number {
  return side === "long" ? entry * (1 - 1 / lev) : entry * (1 + 1 / lev);
}

/** Open a leveraged position; locks `marginTry` of cash as collateral. */
export async function openPosition(
  userId: string,
  input: PositionInput,
): Promise<PositionResult> {
  const meta = ASSET_BY_TICKER[input.ticker];
  if (!meta) return err("Geçersiz varlık.");
  if (!isLeverageable(meta))
    return err("Bu varlık kaldıraçlı işleme uygun değil.");
  if (input.side !== "long" && input.side !== "short")
    return err("Geçersiz yön.");
  const lev = Math.round(input.leverage);
  if (!(lev >= 1 && lev <= MAX_LEVERAGE))
    return err(`Kaldıraç 1x ile ${MAX_LEVERAGE}x arasında olmalı.`);
  let margin = Number(input.marginTry);
  if (!(margin > 0)) return err("Geçerli bir teminat gir.");
  margin = Math.round(margin * 100) / 100;

  // optional take-profit / stop-loss as P&L % on margin
  const tpPct = input.tpPct != null && input.tpPct > 0 ? Math.round(input.tpPct) : null;
  let slPct = input.slPct != null && input.slPct > 0 ? Math.round(input.slPct) : null;
  if (slPct != null && slPct > 99) slPct = 99; // 100% loss = liquidation

  // Freshest data at open time (anti front-running) + spread: long enters
  // slightly above mid, short slightly below.
  const snap = await getFreshPrices();
  const live = snap.prices[input.ticker];
  if (!live || !(live.priceTry > 0))
    return err("Anlık fiyat alınamadı, tekrar dene.");
  const entry = input.side === "long" ? live.priceTry * (1 + EXEC_SPREAD) : live.priceTry * (1 - EXEC_SPREAD);

  return db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return err("Kullanıcı bulunamadı.");

    const open = await tx
      .select({ id: positions.id })
      .from(positions)
      .where(and(eq(positions.userId, userId), eq(positions.status, "open")));
    if (open.length >= MAX_OPEN_POSITIONS)
      return err(`En fazla ${MAX_OPEN_POSITIONS} açık pozisyon tutabilirsin.`);

    let cash = Number(user.cashBalanceTry);
    if (margin > cash + 1e-6) return err("Yetersiz nakit bakiye.");

    const notional = margin * lev;
    const quantity = notional / entry;
    const liq = liqPrice(entry, input.side, lev);
    cash -= margin;

    await tx.insert(positions).values({
      userId,
      assetId: input.ticker,
      assetType: meta.type,
      symbol: meta.symbol ?? input.ticker,
      name: meta.name,
      side: input.side,
      leverage: lev,
      quantity: String(quantity),
      entryPriceTry: String(entry),
      marginTry: String(margin),
      liquidationPriceTry: String(liq),
      tpPct,
      slPct,
    });
    await tx
      .update(users)
      .set({ cashBalanceTry: String(cash), updatedAt: new Date() })
      .where(eq(users.id, userId));

    return { ok: true };
  });
}

/** Close an open position at the live price; returns margin + P&L to cash. */
export async function closePosition(
  userId: string,
  positionId: string,
): Promise<PositionResult> {
  const snap = await getLivePrices();
  return db.transaction(async (tx) => {
    const [pos] = await tx
      .select()
      .from(positions)
      .where(and(eq(positions.id, positionId), eq(positions.userId, userId)))
      .limit(1);
    if (!pos) return err("Pozisyon bulunamadı.");
    if (pos.status !== "open") return err("Pozisyon zaten kapalı.");

    const live = snap.prices[pos.assetId];
    const price = live?.priceTry ?? Number(pos.entryPriceTry);
    const entry = Number(pos.entryPriceTry);
    const qty = Number(pos.quantity);
    const margin = Number(pos.marginTry);
    const dir = pos.side === "long" ? 1 : -1;
    let pnl = (price - entry) * qty * dir;
    if (pnl < -margin) pnl = -margin; // can't lose more than collateral

    const [user] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return err("Kullanıcı bulunamadı.");
    const cash = Number(user.cashBalanceTry) + margin + pnl;

    await tx
      .update(positions)
      .set({ status: "closed", realizedPnlTry: String(pnl), closedAt: new Date() })
      .where(eq(positions.id, positionId));
    await tx
      .update(users)
      .set({ cashBalanceTry: String(cash), updatedAt: new Date() })
      .where(eq(users.id, userId));

    return { ok: true, realizedPnlTry: pnl };
  });
}

type OpenPos = typeof positions.$inferSelect;

/**
 * Decide what to do with an open position at the current price:
 *  - "liquidate": price crossed the liquidation level (margin lost)
 *  - "close": take-profit / stop-loss level hit (fills at the level, no slippage)
 *  - "keep": still open
 */
function evalPosition(pos: OpenPos, snap: PriceSnapshot): {
  action: "keep" | "liquidate" | "close";
  price: number;
  pnl: number;
  realizedPnl?: number;
} {
  const live = snap.prices[pos.assetId];
  const price = live?.priceTry ?? Number(pos.entryPriceTry);
  const entry = Number(pos.entryPriceTry);
  const qty = Number(pos.quantity);
  const margin = Number(pos.marginTry);
  const liq = Number(pos.liquidationPriceTry);
  const dir = pos.side === "long" ? 1 : -1;
  const pnl = (price - entry) * qty * dir;

  const crossed = pos.side === "long" ? price <= liq : price >= liq;
  if (crossed || pnl <= -margin) return { action: "liquidate", price, pnl: -margin };

  const pnlPct = margin > 0 ? (pnl / margin) * 100 : 0;
  if (pos.tpPct != null && pnlPct >= pos.tpPct)
    return { action: "close", price, pnl, realizedPnl: (margin * pos.tpPct) / 100 };
  if (pos.slPct != null && pnlPct <= -pos.slPct)
    return { action: "close", price, pnl, realizedPnl: (-margin * pos.slPct) / 100 };

  return { action: "keep", price, pnl };
}

/**
 * Value a user's open positions at live prices, settling any that hit their
 * liquidation / take-profit / stop-loss. Liquidations lose the margin; TP/SL
 * return margin + realized P&L to cash. Returns live views + total equity.
 */
export async function settleAndValuePositions(
  userId: string,
  snap: PriceSnapshot,
): Promise<{ positions: PositionView[]; equityTry: number }> {
  const rows = await db
    .select()
    .from(positions)
    .where(and(eq(positions.userId, userId), eq(positions.status, "open")));

  const views: PositionView[] = [];
  const toLiquidate: { id: string; margin: number }[] = [];
  const toClose: { id: string; realizedPnl: number }[] = [];
  let equity = 0;
  let cashBack = 0;

  for (const pos of rows) {
    const margin = Number(pos.marginTry);
    const r = evalPosition(pos, snap);
    if (r.action === "liquidate") {
      toLiquidate.push({ id: pos.id, margin });
      continue;
    }
    if (r.action === "close") {
      toClose.push({ id: pos.id, realizedPnl: r.realizedPnl! });
      cashBack += margin + r.realizedPnl!;
      continue;
    }
    const entry = Number(pos.entryPriceTry);
    const liq = Number(pos.liquidationPriceTry);
    const eq2 = margin + r.pnl;
    equity += eq2;
    const live = snap.prices[pos.assetId];
    const nativeCcy = live?.nativeCcy ?? (pos.assetType === "bist100" ? "TRY" : "USD");
    const ratio = live && live.priceTry > 0 ? live.nativePrice / live.priceTry : snap.usdTry > 0 ? 1 / snap.usdTry : 1;
    views.push({
      id: pos.id,
      ticker: pos.assetId,
      name: pos.name,
      type: pos.assetType as string,
      side: pos.side as "long" | "short",
      leverage: pos.leverage,
      quantity: Number(pos.quantity),
      entryPriceTry: entry,
      priceTry: r.price,
      entryNative: entry * ratio,
      priceNative: r.price * ratio,
      nativeCcy,
      marginTry: margin,
      liquidationPriceTry: liq,
      pnlTry: r.pnl,
      pnlPct: margin > 0 ? (r.pnl / margin) * 100 : 0,
      equityTry: eq2,
      tpPct: pos.tpPct,
      slPct: pos.slPct,
    });
  }

  for (const l of toLiquidate) {
    await db
      .update(positions)
      .set({ status: "liquidated", realizedPnlTry: String(-l.margin), closedAt: new Date() })
      .where(eq(positions.id, l.id));
  }
  for (const c of toClose) {
    await db
      .update(positions)
      .set({ status: "closed", realizedPnlTry: String(c.realizedPnl), closedAt: new Date() })
      .where(eq(positions.id, c.id));
  }
  if (cashBack !== 0) {
    await db
      .update(users)
      .set({ cashBalanceTry: sql`${users.cashBalanceTry} + ${cashBack}`, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  return { positions: views, equityTry: equity };
}

let lastSettleAll = 0;

/**
 * Settle TP/SL/liquidation for EVERY open position against fresh prices.
 * Runs from the leaderboard route and the cron so triggers fire even when the
 * position owner isn't looking. Throttled so hot reads don't hammer the DB.
 */
export async function settleAllPositions(minGapMs = 20_000): Promise<number> {
  if (Date.now() - lastSettleAll < minGapMs) return 0;
  lastSettleAll = Date.now();

  const snap = await getFreshPrices();
  const rows = await db.select().from(positions).where(eq(positions.status, "open"));

  const liquidate: string[] = [];
  const close: { id: string; realizedPnl: number }[] = [];
  const cashByUser = new Map<string, number>();

  for (const pos of rows) {
    const margin = Number(pos.marginTry);
    const r = evalPosition(pos, snap);
    if (r.action === "liquidate") {
      liquidate.push(pos.id);
    } else if (r.action === "close") {
      close.push({ id: pos.id, realizedPnl: r.realizedPnl! });
      cashByUser.set(pos.userId, (cashByUser.get(pos.userId) ?? 0) + margin + r.realizedPnl!);
    }
  }

  for (const id of liquidate) {
    const m = Number(rows.find((p) => p.id === id)!.marginTry);
    await db
      .update(positions)
      .set({ status: "liquidated", realizedPnlTry: String(-m), closedAt: new Date() })
      .where(eq(positions.id, id));
  }
  for (const c of close) {
    await db
      .update(positions)
      .set({ status: "closed", realizedPnlTry: String(c.realizedPnl), closedAt: new Date() })
      .where(eq(positions.id, c.id));
  }
  for (const [uid, amt] of cashByUser) {
    await db
      .update(users)
      .set({ cashBalanceTry: sql`${users.cashBalanceTry} + ${amt}`, updatedAt: new Date() })
      .where(eq(users.id, uid));
  }

  return liquidate.length + close.length;
}
