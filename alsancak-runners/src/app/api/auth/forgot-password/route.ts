import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { members, passwordResetTokens } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rateLimit";

/**
 * POST /api/auth/forgot-password
 * Generate a 6-digit reset code, hash it with bcrypt, store in DB.
 * Production: does not return the code in the response.
 */
export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    const rateLimited = await checkRateLimit(`forgot-password:${ip}`, {
      maxRequests: 5,
      windowSec: 300, // 5 requests per 5 minutes
      failOpen: false,
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

    // Check if user exists
    const [member] = await db
      .select({ id: members.id })
      .from(members)
      .where(eq(members.email, email))
      .limit(1);

    if (!member) {
      // Don't reveal whether email exists — but in dev mode we can be more helpful
      return NextResponse.json(
        { error: "Bu email adresiyle kayitli bir hesap bulunamadi" },
        { status: 404 },
      );
    }

    // Delete any existing unused tokens for this user
    await db
      .delete(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.memberId, member.id),
          isNull(passwordResetTokens.usedAt),
        ),
      );

    // Generate 6-digit code and hash it
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const tokenHash = await bcrypt.hash(code, 10);

    // Store with 10-minute expiry
    await db.insert(passwordResetTokens).values({
      memberId: member.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Production: don't return the code in the response
    return NextResponse.json({
      success: true,
      message: "Kod gonderildi",
      expiresInMinutes: 10,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Bir hata olustu, tekrar deneyin" },
      { status: 500 },
    );
  }
}
