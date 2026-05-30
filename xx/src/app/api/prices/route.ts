import { NextResponse } from "next/server";
import { getLivePrices } from "@/lib/prices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/prices            → all live TL prices
// GET /api/prices?tickers=BTC,AAPL → subset
export async function GET(req: Request) {
  try {
    const snap = await getLivePrices();
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("tickers");

    let prices = snap.prices;
    if (filter) {
      const want = new Set(
        filter.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean),
      );
      prices = Object.fromEntries(
        Object.entries(snap.prices).filter(([t]) => want.has(t.toUpperCase())),
      );
    }

    return NextResponse.json(
      {
        ok: true,
        usdTry: snap.usdTry,
        fetchedAt: snap.fetchedAt,
        count: Object.keys(prices).length,
        missing: snap.missing,
        prices,
      },
      { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "price error" },
      { status: 500 },
    );
  }
}
