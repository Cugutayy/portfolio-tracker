import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getPortfolio } from "@/lib/portfolio";
import { db } from "@/lib/db";
import { trades, positions } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/portfolio → current user's valued portfolio + recent trades
export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });

  try {
    const [view, recent, closedPos] = await Promise.all([
      getPortfolio(user.id),
      db
        .select()
        .from(trades)
        .where(eq(trades.userId, user.id))
        .orderBy(desc(trades.tradedAt))
        .limit(30),
      db
        .select()
        .from(positions)
        .where(and(eq(positions.userId, user.id), inArray(positions.status, ["closed", "liquidated"])))
        .orderBy(desc(positions.closedAt))
        .limit(30),
    ]);

    return NextResponse.json({
      ok: true,
      portfolio: view,
      trades: recent.map((t) => ({
        id: t.id,
        ticker: t.assetId,
        name: t.name,
        side: t.side,
        quantity: Number(t.quantity),
        priceTry: Number(t.priceTry),
        amountTry: Number(t.amountTry),
        realizedPnlTry: t.realizedPnlTry != null ? Number(t.realizedPnlTry) : null,
        tradedAt: t.tradedAt,
      })),
      positionHistory: closedPos.map((p) => ({
        id: p.id,
        ticker: p.assetId,
        name: p.name,
        side: p.side,
        leverage: p.leverage,
        marginTry: Number(p.marginTry),
        realizedPnlTry: p.realizedPnlTry != null ? Number(p.realizedPnlTry) : null,
        liquidated: p.status === "liquidated",
        closedAt: p.closedAt,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "error" },
      { status: 500 },
    );
  }
}
