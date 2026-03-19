import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "fallback-secret-change-me",
);

const ISSUER = "alsancak-runners";
const AUDIENCE = "rota-app";

/**
 * Create a signed JWT for mobile app auth.
 * Contains user ID and role — valid for 30 days.
 */
export async function createMobileToken(user: {
  id: string;
  role?: string;
}): Promise<string> {
  return new SignJWT({ sub: user.id, role: user.role || "member" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime("30d")
    .sign(secret);
}

/**
 * Verify a mobile JWT token and extract the user ID.
 * Returns null if token is invalid or expired.
 */
export async function verifyMobileToken(
  token: string,
): Promise<{ userId: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (!payload.sub) return null;
    return {
      userId: payload.sub,
      role: (payload.role as string) || "member",
    };
  } catch {
    return null;
  }
}

/**
 * Extract user from request — checks both:
 * 1. NextAuth session (web, cookie-based)
 * 2. Mobile Bearer token (Authorization header)
 *
 * Use this instead of `auth()` in API routes that serve both web and mobile.
 */
export async function getRequestUser(
  request: NextRequest,
): Promise<{ id: string; role: string } | null> {
  // 1. Check Bearer token (mobile app)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const result = await verifyMobileToken(token);
    if (result) {
      return { id: result.userId, role: result.role };
    }
  }

  // 2. Check cookie token (mobile app also sends this)
  const cookieToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  if (cookieToken) {
    // Try as mobile JWT first
    const result = await verifyMobileToken(cookieToken);
    if (result) {
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
