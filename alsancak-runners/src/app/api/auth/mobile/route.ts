import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createTokenPair, verifyMobileToken } from "@/lib/mobile-auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

/**
 * POST /api/auth/mobile — Mobile login, registration, and token refresh
 *
 * Login:    { email, password }         → { accessToken, refreshToken, expiresAt, user }
 * Register: { email, password, name }   → { accessToken, refreshToken, expiresAt, user }
 * Refresh:  { refreshToken }            → { accessToken, refreshToken, expiresAt }
 */
export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    const body = await request.json();
    const { email: rawEmail, password, name, refreshToken: incomingRefresh } = body;

    // ── REFRESH MODE ──
    if (incomingRefresh && !rawEmail) {
      const payload = await verifyMobileToken(incomingRefresh);
      if (!payload || payload.type !== "refresh") {
        return NextResponse.json(
          { error: "Gecersiz veya suresi dolmus refresh token" },
          { status: 401 },
        );
      }

      // Look up user to get current role
      const [member] = await db
        .select({ id: members.id, role: members.role })
        .from(members)
        .where(eq(members.id, payload.userId))
        .limit(1);

      if (!member) {
        return NextResponse.json(
          { error: "Kullanici bulunamadi" },
          { status: 401 },
        );
      }

      const tokens = await createTokenPair({ id: member.id, role: member.role });

      return NextResponse.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        // Also return token for backward compat
        token: tokens.accessToken,
      });
    }

    // ── LOGIN / REGISTER MODE ──
    if (!rawEmail || !password) {
      return NextResponse.json(
        { error: "Email ve sifre gerekli" },
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

    // ── REGISTER (name provided) ──
    if (name) {
      const rateLimited = await checkRateLimit(
        `register:${ip}`,
        RATE_LIMITS.authRegister,
      );
      if (rateLimited) return rateLimited;

      if (password.length < 8) {
        return NextResponse.json(
          { error: "Sifre en az 8 karakter olmali" },
          { status: 400 },
        );
      }

      const [existing] = await db
        .select({ id: members.id })
        .from(members)
        .where(eq(members.email, email))
        .limit(1);

      if (existing) {
        return NextResponse.json(
          { error: "Bu email adresi zaten kayitli" },
          { status: 409 },
        );
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const [member] = await db
        .insert(members)
        .values({
          name: name.trim(),
          email,
          passwordHash,
          privacy: "members",
        })
        .returning({
          id: members.id,
          name: members.name,
          email: members.email,
          role: members.role,
        });

      const tokens = await createTokenPair({ id: member.id, role: member.role });

      return NextResponse.json(
        {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          token: tokens.accessToken, // backward compat
          user: { id: member.id, name: member.name, email: member.email },
        },
        { status: 201 },
      );
    }

    // ── LOGIN (no name) ──
    const rateLimited = await checkRateLimit(
      `login:${ip}`,
      { maxRequests: 10, windowSec: 60 },
    );
    if (rateLimited) return rateLimited;

    const [member] = await db
      .select({
        id: members.id,
        name: members.name,
        email: members.email,
        passwordHash: members.passwordHash,
        role: members.role,
      })
      .from(members)
      .where(eq(members.email, email))
      .limit(1);

    if (!member || !member.passwordHash) {
      return NextResponse.json(
        { error: "Email veya sifre hatali" },
        { status: 401 },
      );
    }

    const isValid = await bcrypt.compare(password, member.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Email veya sifre hatali" },
        { status: 401 },
      );
    }

    const tokens = await createTokenPair({ id: member.id, role: member.role });

    return NextResponse.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      token: tokens.accessToken, // backward compat
      user: { id: member.id, name: member.name, email: member.email },
    });
  } catch (error) {
    console.error("Mobile auth error:", error);
    return NextResponse.json(
      { error: "Bir hata olustu, tekrar deneyin" },
      { status: 500 },
    );
  }
}
