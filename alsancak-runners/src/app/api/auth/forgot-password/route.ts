import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { members, passwordResetCodes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rateLimit";
import { createHash } from "crypto";

export function hashResetCode(email: string, code: string): string {
  const pepper = process.env.AUTH_SECRET || "fallback";
  return createHash("sha256")
    .update(`${email}:${code}:${pepper}`)
    .digest("hex");
}

/**
 * POST /api/auth/forgot-password
 * Generate a 6-digit reset code for the given email.
 * Always returns a generic success response to avoid account enumeration.
 */
export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    const rateLimited = await checkRateLimit(`forgot-password:${ip}`, {
      maxRequests: 5,
      windowSec: 300, // 5 requests per 5 minutes
      strict: true,
    });
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const rawEmail = body?.email;

    if (!rawEmail || typeof rawEmail !== "string") {
      return NextResponse.json(
        { error: "Email adresi gerekli" },
        { status: 400 },
      );
    }

    const email = rawEmail.toLowerCase().trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Gecerli bir email adresi girin" },
        { status: 400 },
      );
    }

    // Check if user exists (but keep response generic either way)
    const [member] = await db
      .select({ id: members.id })
      .from(members)
      .where(eq(members.email, email))
      .limit(1);

    if (!member) {
      return NextResponse.json({
        success: true,
        message: "Eger hesap mevcutsa sifre sifirlama kodu gonderildi",
      });
    }

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const codeHash = hashResetCode(email, code);

    // Upsert one active code per email
    const [existing] = await db
      .select({ id: passwordResetCodes.id })
      .from(passwordResetCodes)
      .where(eq(passwordResetCodes.email, email))
      .limit(1);

    if (existing) {
      await db
        .update(passwordResetCodes)
        .set({
          codeHash,
          expiresAt,
          attempts: 0,
          updatedAt: new Date(),
        })
        .where(eq(passwordResetCodes.id, existing.id));
    } else {
      await db.insert(passwordResetCodes).values({
        email,
        codeHash,
        expiresAt,
        attempts: 0,
      });
    }

    // TODO: deliver `code` over email/SMS provider.
    // Intentionally not returned in API response.
    return NextResponse.json({
      success: true,
      message: "Eger hesap mevcutsa sifre sifirlama kodu gonderildi",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Bir hata olustu, tekrar deneyin" },
      { status: 500 },
    );
  }
}
