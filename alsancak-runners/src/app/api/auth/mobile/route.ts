import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createMobileToken } from "@/lib/mobile-auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

/**
 * POST /api/auth/mobile — Mobile login + registration (unified endpoint)
 *
 * Body: { email, password, name? }
 * - If name is provided: register new account, then auto-login
 * - If name is omitted: login with existing account
 *
 * Returns: { token, user: { id, name, email } }
 */
export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    const body = await request.json();
    const { email: rawEmail, password, name } = body;

    if (!rawEmail || !password) {
      return NextResponse.json(
        { error: "Email ve sifre gerekli" },
        { status: 400 },
      );
    }

    const email = rawEmail.toLowerCase().trim();

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Gecerli bir email adresi girin" },
        { status: 400 },
      );
    }

    // ── REGISTER MODE (name provided) ──
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

      // Check duplicate
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
          privacy: "members", // visible to other members by default (social app)
        })
        .returning({
          id: members.id,
          name: members.name,
          email: members.email,
          role: members.role,
        });

      const token = await createMobileToken({
        id: member.id,
        role: member.role,
      });

      return NextResponse.json(
        {
          token,
          user: { id: member.id, name: member.name, email: member.email },
        },
        { status: 201 },
      );
    }

    // ── LOGIN MODE (no name) ──
    const rateLimited = await checkRateLimit(
      `login:${ip}`,
      { maxRequests: 10, windowSec: 60 }, // 10 attempts/minute
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

    const token = await createMobileToken({
      id: member.id,
      role: member.role,
    });

    return NextResponse.json({
      token,
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
