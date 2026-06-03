import { NextResponse } from "next/server";
import { snapshotAllUsers } from "@/lib/portfolio";
import { settleAllPositions } from "@/lib/positions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/cron/snapshot — Vercel Cron daily snapshot of every portfolio.
// Secured by CRON_SECRET when set (Vercel sends it as a Bearer token).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = req.headers.get("authorization");
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }
  try {
    const settled = await settleAllPositions(0); // force: settle TP/SL/liquidation
    const count = await snapshotAllUsers();
    return NextResponse.json({ ok: true, settled, snapshotted: count, at: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "error" },
      { status: 500 },
    );
  }
}
