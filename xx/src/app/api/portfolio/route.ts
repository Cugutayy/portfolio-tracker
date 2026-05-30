import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getPortfolio } from "@/lib/portfolio";
import { db } from "@/lib/db";
import { trades } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/portfolio → current user's valued portfolio + recent trades
export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });

  try {
    const [view, recent] = await Promise.all([
      getPortfolio(user.id),
      db
        .select()
        .from(trades)
        .where(eq(trades.userId, user.id))
        .orderBy(desc(trades.tradedAt))
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
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "error" },
      { status: 500 },
    );
  }
}
