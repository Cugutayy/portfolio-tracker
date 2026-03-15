import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = ["/dashboard"];
const authPaths = ["/join"];

async function middleware(req: NextRequest) {
  try {
    // Dynamic import so a missing AUTH_SECRET doesn't crash the entire edge
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    const { pathname } = req.nextUrl;
    const isLoggedIn = !!session?.user;

    // Redirect authenticated users away from auth pages
    if (isLoggedIn && authPaths.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Redirect unauthenticated users to join page
    if (!isLoggedIn && protectedPaths.some((p) => pathname.startsWith(p))) {
      const callbackUrl = encodeURIComponent(pathname);
      return NextResponse.redirect(
        new URL(`/join?callbackUrl=${callbackUrl}`, req.url),
      );
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware auth error:", error);
    // On auth failure, redirect to join page — fail-closed to prevent
    // unauthenticated access to protected routes.
    const { pathname } = req.nextUrl;
    if (protectedPaths.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL("/join", req.url));
    }
    return NextResponse.next();
  }
}

export default middleware;

export const config = {
  matcher: ["/dashboard/:path*", "/join"],
};
