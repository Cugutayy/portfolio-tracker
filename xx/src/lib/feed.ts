// ─────────────────────────────────────────────────────────────
// Activity feed — a public "tape" of recent moves across the arena:
// spot buys/sells (trades) + leveraged opens/closes (positions).
// Drives the "what's everyone doing" engagement loop.
// ─────────────────────────────────────────────────────────────
import { db } from "@/lib/db";
import { trades, positions, users } from "@/db/schema";
import { desc, eq, and, isNotNull, inArray } from "drizzle-orm";

export interface FeedEvent {
  kind: "buy" | "sell" | "open" | "close";
  userName: string;
  userHandle: string;
  userImage: string | null;
  ticker: string;
  name: string;
  side?: "long" | "short";
  leverage?: number;
  amountTry?: number; // spot trade size
  pnlTry?: number | null; // realized P&L on close
  liquidated?: boolean;
  at: string; // ISO
}

export async function getActivityFeed(limit = 30): Promise<FeedEvent[]> {
  const [tr, opens, closes] = await Promise.all([
    db
      .select({
        userName: users.name,
        userHandle: users.handle,
        userImage: users.image,
        ticker: trades.assetId,
        name: trades.name,
        side: trades.side,
        amountTry: trades.amountTry,
        at: trades.tradedAt,
      })
      .from(trades)
      .innerJoin(users, eq(users.id, trades.userId))
      .orderBy(desc(trades.tradedAt))
      .limit(limit),
    db
      .select({
        userName: users.name,
        userHandle: users.handle,
        userImage: users.image,
        ticker: positions.assetId,
        name: positions.name,
        side: positions.side,
        leverage: positions.leverage,
        at: positions.openedAt,
      })
      .from(positions)
      .innerJoin(users, eq(users.id, positions.userId))
      .orderBy(desc(positions.openedAt))
      .limit(limit),
    db
      .select({
        userName: users.name,
        userHandle: users.handle,
        userImage: users.image,
        ticker: positions.assetId,
        name: positions.name,
        side: positions.side,
        leverage: positions.leverage,
        pnlTry: positions.realizedPnlTry,
        status: positions.status,
        at: positions.closedAt,
      })
      .from(positions)
      .innerJoin(users, eq(users.id, positions.userId))
      .where(and(isNotNull(positions.closedAt), inArray(positions.status, ["closed", "liquidated"])))
      .orderBy(desc(positions.closedAt))
      .limit(limit),
  ]);

  const events: FeedEvent[] = [
    ...tr.map((t) => ({
      kind: t.side as "buy" | "sell",
      userName: t.userName,
      userHandle: t.userHandle,
      userImage: t.userImage,
      ticker: t.ticker,
      name: t.name,
      amountTry: Number(t.amountTry),
      at: (t.at as Date).toISOString(),
    })),
    ...opens.map((p) => ({
      kind: "open" as const,
      userName: p.userName,
      userHandle: p.userHandle,
      userImage: p.userImage,
      ticker: p.ticker,
      name: p.name,
      side: p.side as "long" | "short",
      leverage: p.leverage,
      at: (p.at as Date).toISOString(),
    })),
    ...closes.map((p) => ({
      kind: "close" as const,
      userName: p.userName,
      userHandle: p.userHandle,
      userImage: p.userImage,
      ticker: p.ticker,
      name: p.name,
      side: p.side as "long" | "short",
      leverage: p.leverage,
      pnlTry: p.pnlTry != null ? Number(p.pnlTry) : null,
      liquidated: p.status === "liquidated",
      at: (p.at as Date).toISOString(),
    })),
  ];

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return events.slice(0, limit);
}
