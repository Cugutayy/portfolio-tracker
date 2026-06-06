import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { positions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getPortfolio } from "@/lib/portfolio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  positionId: z.string().uuid(),
  tpPct: z.number().int().positive().max(5000).nullable(),
  slPct: z.number().int().positive().max(99).nullable(),
});

// POST /api/positions/tpsl { positionId, tpPct, slPct } — set/clear TP & SL on
// an OPEN position (owner only). Pass null to remove a level.
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me)
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ ok: false, error: "Geçersiz veri." }, { status: 400 });

  const { positionId, tpPct, slPct } = parsed.data;

  const [pos] = await db
    .select({ id: positions.id, userId: positions.userId, status: positions.status })
    .from(positions)
    .where(eq(positions.id, positionId))
    .limit(1);
  if (!pos || pos.userId !== me.id)
    return NextResponse.json({ ok: false, error: "Pozisyon bulunamadı." }, { status: 404 });
  if (pos.status !== "open")
    return NextResponse.json({ ok: false, error: "Pozisyon kapalı." }, { status: 422 });

  await db
    .update(positions)
    .set({ tpPct, slPct })
    .where(and(eq(positions.id, positionId), eq(positions.userId, me.id)));

  const portfolio = await getPortfolio(me.id);
  return NextResponse.json({ ok: true, portfolio });
}
