import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "fallback-secret-change-me",
);

const ISSUER = "alsancak-runners";
const AUDIENCE = "rota-app";

/**
 * Create access + refresh token pair for mobile auth.
 * Access token: 1 hour (short-lived, used for API calls)
 * Refresh token: 30 days (long-lived, used to get new access token)
 */
export async function createTokenPair(user: {
  id: string;
  role?: string;
}): Promise<{ accessToken: string; refreshToken: string; expiresAt: number }> {
  const now = Math.floor(Date.now() / 1000);

  const accessToken = await new SignJWT({
    sub: user.id,
    role: user.role || "member",
    type: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime("1h")
    .sign(secret);

  const refreshToken = await new SignJWT({
    sub: user.id,
    type: "refresh",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime("30d")
    .sign(secret);

  return {
    accessToken,
    refreshToken,
    expiresAt: now + 3600, // 1 hour from now
  };
}

/** Legacy: create single token (backward compat during migration) */
export async function createMobileToken(user: {
  id: string;
  role?: string;
}): Promise<string> {
  const { accessToken } = await createTokenPair(user);
  return accessToken;
}

/**
 * Verify a mobile JWT token (access or refresh).
 * Returns null if token is invalid or expired.
 */
export async function verifyMobileToken(
  token: string,
): Promise<{ userId: string; role: string; type: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (!payload.sub) return null;
    return {
      userId: payload.sub,
      role: (payload.role as string) || "member",
      type: (payload.type as string) || "access",
    };
  } catch {
    return null;
  }
}

/**
 * Extract user from request — checks both:
 * 1. Mobile Bearer token (Authorization header)
 * 2. Cookie token (mobile also sends this)
 * 3. NextAuth session (web, cookie-based)
 */
export async function getRequestUser(
  request: NextRequest,
): Promise<{ id: string; role: string } | null> {
  // 1. Check Bearer token (mobile app)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const result = await verifyMobileToken(token);
    if (result && result.type === "access") {
      return { id: result.userId, role: result.role };
    }
  }

  // 2. Check cookie token (mobile app also sends this)
  const cookieToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  if (cookieToken) {
    const result = await verifyMobileToken(cookieToken);
    if (result && result.type === "access") {
      return { id: result.userId, role: result.role };
    }
  }

  // 3. Fall back to NextAuth session (web)
  try {
    const { auth } = await import("./auth");
    const session = await auth();
    if (session?.user?.id) {
      return {
        id: session.user.id,
        role: (session as unknown as { role?: string }).role || "member",
      };
    }
  } catch {
    // auth() may fail in certain contexts
  }

  return null;
}
