import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { executeTrade, getPortfolio } from "@/lib/portfolio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z
  .object({
    ticker: z.string().min(1).max(12),
    side: z.enum(["buy", "sell"]),
    amountTry: z.number().positive().finite().optional(),
    quantity: z.number().positive().finite().optional(),
  })
  .refine((v) => v.amountTry != null || v.quantity != null, {
    message: "amountTry veya quantity gerekli",
  });

// POST /api/trade { ticker, side, amountTry? | quantity? }
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz istek." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri." },
      { status: 400 },
    );

  try {
    const result = await executeTrade(user.id, parsed.data);
    if (!result.ok)
      return NextResponse.json({ ok: false, error: result.error }, { status: 422 });

    const portfolio = await getPortfolio(user.id);
    return NextResponse.json({ ok: true, trade: result.trade, portfolio });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "İşlem hatası." },
      { status: 500 },
    );
  }
}
