import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { closePosition } from "@/lib/positions";
import { getPortfolio } from "@/lib/portfolio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  positionId: z.string().uuid(),
});

// POST /api/positions/close { positionId }
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
    const result = await closePosition(user.id, parsed.data.positionId);
    if (!result.ok)
      return NextResponse.json({ ok: false, error: result.error }, { status: 422 });

    const portfolio = await getPortfolio(user.id);
    return NextResponse.json({
      ok: true,
      realizedPnlTry: result.realizedPnlTry,
      portfolio,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "İşlem hatası." },
      { status: 500 },
    );
  }
}
