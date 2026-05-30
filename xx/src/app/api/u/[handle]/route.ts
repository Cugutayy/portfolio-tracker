import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getPublicProfile } from "@/lib/portfolio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/u/:handle → public profile (valued live) + viewer social state
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const { handle } = await params;
  const me = await getCurrentUser();
  try {
    const profile = await getPublicProfile(handle, me?.id ?? null);
    if (!profile)
      return NextResponse.json({ ok: false, error: "Kullanıcı bulunamadı" }, { status: 404 });
    return NextResponse.json({ ok: true, profile });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "error" },
      { status: 500 },
    );
  }
}
