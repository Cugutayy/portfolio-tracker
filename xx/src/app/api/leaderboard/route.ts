import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/portfolio";
import { settleAllPositions } from "@/lib/positions";
import { getLivePrices } from "@/lib/prices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/leaderboard → all real users ranked by live total value
export async function GET() {
  try {
    // settle any TP/SL/liquidation triggers (throttled) so the board is current
    await settleAllPositions().catch(() => {});
    const [rows, snap] = await Promise.all([getLeaderboard(), getLivePrices()]);
    return NextResponse.json({ ok: true, count: rows.length, leaderboard: rows, usdTry: snap.usdTry });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "error" },
      { status: 500 },
    );
  }
}
