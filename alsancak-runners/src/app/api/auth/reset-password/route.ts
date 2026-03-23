import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { members, passwordResetTokens } from "@/db/schema";
import { eq, and, isNull, gt, desc } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rateLimit";

const MAX_CODE_ATTEMPTS = 5;

/**
 * POST /api/auth/reset-password
 * Verify reset code (from DB) and set new password.
 * Body: { email, code, newPassword }
 */
export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    const rateLimited = await checkRateLimit(`reset-password:${ip}`, {
      maxRequests: 10,
      windowSec: 300,
      failOpen: false,
    });
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { email: rawEmail, code, newPassword } = body || {};

    if (!rawEmail || !code || !newPassword) {
      return NextResponse.json(
        { error: "Email, kod ve yeni sifre gerekli" },
        { status: 400 },
      );
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "Sifre en az 8 karakter olmali" },
        { status: 400 },
      );
    }

    const email =
      typeof rawEmail === "string" ? rawEmail.toLowerCase().trim() : "";

    if (!email) {
      return NextResponse.json(
        { error: "Gecerli bir email adresi girin" },
        { status: 400 },
      );
    }

    // Find the member
    const [member] = await db
      .select({ id: members.id })
      .from(members)
      .where(eq(members.email, email))
      .limit(1);

    if (!member) {
      return NextResponse.json(
        { error: "Kullanici bulunamadi" },
        { status: 404 },
      );
    }

    // Look up the latest non-expired, non-used token for this member
    const [token] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.memberId, member.id),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(passwordResetTokens.createdAt))
      .limit(1);

    if (!token) {
      return NextResponse.json(
        { error: "Sifre sifirlama kodu bulunamadi. Lutfen yeni kod isteyin." },
        { status: 400 },
      );
    }

    // Check max attempts
    if (token.attempts >= MAX_CODE_ATTEMPTS) {
      return NextResponse.json(
        {
          error:
            "Cok fazla basarisiz deneme. Lutfen yeni kod isteyin.",
        },
        { status: 429 },
      );
    }

    // Verify code with bcrypt
    const codeMatch = await bcrypt.compare(String(code).trim(), token.tokenHash);

    if (!codeMatch) {
      // Increment attempts
      await db
        .update(passwordResetTokens)
        .set({ attempts: token.attempts + 1 })
        .where(eq(passwordResetTokens.id, token.id));

      return NextResponse.json(
        {
          error: "Gecersiz kod. Lutfen tekrar deneyin.",
          attemptsRemaining: MAX_CODE_ATTEMPTS - (token.attempts + 1),
        },
        { status: 400 },
      );
    }

    // Code is valid — mark token as used
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, token.id));

    // Update password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    const result = await db
      .update(members)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(members.email, email))
      .returning({ id: members.id });

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Kullanici bulunamadi" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Sifreniz basariyla guncellendi",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Bir hata olustu, tekrar deneyin" },
      { status: 500 },
    );
  }
}
