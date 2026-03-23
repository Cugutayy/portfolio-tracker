import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getRequestUser } from "@/lib/mobile-auth";
import { checkRateLimit } from "@/lib/rateLimit";

/**
 * POST /api/auth/change-password
 * Change password for the authenticated user.
 * Body: { currentPassword, newPassword }
 * Requires: Bearer token (authenticated)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Giris yapmaniz gerekiyor" },
        { status: 401 },
      );
    }

    const rateLimited = await checkRateLimit(
      `change-password:${user.id}`,
      { maxRequests: 5, windowSec: 300, strict: true },
    );
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { currentPassword, newPassword } = body || {};

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Mevcut sifre ve yeni sifre gerekli" },
        { status: 400 },
      );
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "Yeni sifre en az 8 karakter olmali" },
        { status: 400 },
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "Yeni sifre mevcut sifreden farkli olmali" },
        { status: 400 },
      );
    }

    // Get current password hash
    const [member] = await db
      .select({ id: members.id, passwordHash: members.passwordHash })
      .from(members)
      .where(eq(members.id, user.id))
      .limit(1);

    if (!member || !member.passwordHash) {
      return NextResponse.json(
        { error: "Sifreli hesap bulunamadi. Sosyal giris kullaniyorsaniz once bir sifre belirleyin." },
        { status: 400 },
      );
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, member.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Mevcut sifre hatali" },
        { status: 401 },
      );
    }

    // Hash and update new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db
      .update(members)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(members.id, user.id));

    return NextResponse.json({
      success: true,
      message: "Sifreniz basariyla guncellendi",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Bir hata olustu, tekrar deneyin" },
      { status: 500 },
    );
  }
}
