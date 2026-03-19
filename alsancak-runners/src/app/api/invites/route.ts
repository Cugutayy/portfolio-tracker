import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import { inviteCodes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";

// POST /api/invites - create invite code
export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const code = randomBytes(4).toString("hex").toUpperCase(); // 8 char code
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const [invite] = await db
    .insert(inviteCodes)
    .values({ memberId: user.id, code, expiresAt })
    .returning();

  return NextResponse.json({
    code: invite.code,
    deepLink: `rota://invite/${invite.code}`,
    webLink: `${process.env.NEXT_PUBLIC_BASE_URL || "https://alsancak-runners.vercel.app"}/tr/invite/${invite.code}`,
    expiresAt: invite.expiresAt,
  }, { status: 201 });
}

// GET /api/invites?code=ABC123 - validate invite
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

  const [invite] = await db
    .select()
    .from(inviteCodes)
    .where(eq(inviteCodes.code, code.toUpperCase()))
    .limit(1);

  if (!invite) return NextResponse.json({ valid: false, error: "Geçersiz davet kodu" });
  if (invite.usedAt) return NextResponse.json({ valid: false, error: "Bu kod zaten kullanılmış" });
  if (invite.expiresAt && new Date() > invite.expiresAt) return NextResponse.json({ valid: false, error: "Kodun süresi dolmuş" });

  return NextResponse.json({ valid: true, code: invite.code });
}
