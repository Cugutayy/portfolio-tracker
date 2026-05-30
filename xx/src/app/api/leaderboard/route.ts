import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/portfolio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/leaderboard → all real users ranked by live total value
export async function GET() {
  try {
    const rows = await getLeaderboard();
    return NextResponse.json({ ok: true, count: rows.length, leaderboard: rows });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "error" },
      { status: 500 },
    );
  }
}
