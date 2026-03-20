import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rateLimit";

// In-memory store for password reset codes (dev/beta)
// In production, use Redis or DB + email delivery
const resetCodes = new Map<
  string,
  { code: string; expiresAt: number; attempts: number }
>();

// Clean expired codes periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of resetCodes) {
    if (entry.expiresAt < now) resetCodes.delete(key);
  }
}, 60_000);

export { resetCodes };

/**
 * POST /api/auth/forgot-password
 * Generate a 6-digit reset code for the given email.
 * Dev/beta mode: returns the code in the response.
 * Production: would send via email instead.
 */
export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    const rateLimited = await checkRateLimit(`forgot-password:${ip}`, {
      maxRequests: 5,
      windowSec: 300, // 5 requests per 5 minutes
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

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // Store with 10-minute expiry
    resetCodes.set(email, {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
    });

    // Dev/beta: return code directly
    // Production: send email and don't include code in response
    return NextResponse.json({
      success: true,
      message: "Sifre sifirlama kodu olusturuldu",
      code, // DEV ONLY — remove in production
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
