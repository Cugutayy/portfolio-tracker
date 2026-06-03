import { NextResponse } from "next/server";
import { getActivityFeed } from "@/lib/feed";
import { getLivePrices } from "@/lib/prices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/feed → recent arena activity (trades + position opens/closes)
export async function GET() {
  try {
    const [events, snap] = await Promise.all([getActivityFeed(30), getLivePrices()]);
    return NextResponse.json({ ok: true, events, usdTry: snap.usdTry });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "error" },
      { status: 500 },
    );
  }
}
