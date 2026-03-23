import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { members, passwordResetCodes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rateLimit";
import { hashResetCode } from "../forgot-password/route";

const MAX_CODE_ATTEMPTS = 5;

/**
 * POST /api/auth/reset-password
 * Verify reset code and set new password.
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
      strict: true,
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

    // Look up reset code record
    const [entry] = await db
      .select({
        id: passwordResetCodes.id,
        codeHash: passwordResetCodes.codeHash,
        expiresAt: passwordResetCodes.expiresAt,
        attempts: passwordResetCodes.attempts,
      })
      .from(passwordResetCodes)
      .where(eq(passwordResetCodes.email, email))
      .limit(1);

    if (!entry) {
      return NextResponse.json(
        { error: "Sifre sifirlama kodu bulunamadi. Lutfen yeni kod isteyin." },
        { status: 400 },
      );
    }

    // Check expiry
    const expiresAtMs = new Date(entry.expiresAt).getTime();
    if (expiresAtMs < Date.now()) {
      await db.delete(passwordResetCodes).where(eq(passwordResetCodes.id, entry.id));
      return NextResponse.json(
        {
          error:
            "Sifre sifirlama kodunun suresi dolmus. Lutfen yeni kod isteyin.",
        },
        { status: 400 },
      );
    }

    // Check max attempts
    if (entry.attempts >= MAX_CODE_ATTEMPTS) {
      await db.delete(passwordResetCodes).where(eq(passwordResetCodes.id, entry.id));
      return NextResponse.json(
        {
          error:
            "Cok fazla basarisiz deneme. Lutfen yeni kod isteyin.",
        },
        { status: 429 },
      );
    }

    // Verify code
    const incomingHash = hashResetCode(email, String(code).trim());
    if (entry.codeHash !== incomingHash) {
      const nextAttempts = entry.attempts + 1;
      await db
        .update(passwordResetCodes)
        .set({ attempts: nextAttempts, updatedAt: new Date() })
        .where(eq(passwordResetCodes.id, entry.id));
      return NextResponse.json(
        {
          error: "Gecersiz kod. Lutfen tekrar deneyin.",
          attemptsRemaining: Math.max(0, MAX_CODE_ATTEMPTS - nextAttempts),
        },
        { status: 400 },
      );
    }

    // Code is valid — update password
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

    // Clean up used code
    await db.delete(passwordResetCodes).where(eq(passwordResetCodes.id, entry.id));

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
