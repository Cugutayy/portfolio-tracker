import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const intlMiddleware = createMiddleware(routing);

const protectedPaths = ["/dashboard"];
const authPaths = ["/join"];

function isPathMatch(pathname: string, paths: string[]): boolean {
  // Strip locale prefix (e.g., /tr/dashboard → /dashboard)
  const strippedPath = pathname.replace(/^\/(tr|en)/, '') || '/';
  return paths.some((p) => strippedPath.startsWith(p));
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip locale handling for API routes and internal Next.js routes
  if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  // Run intl middleware first (handles locale redirect)
  const intlResponse = intlMiddleware(req);

  // Check if auth is needed for this path
  const needsAuth = isPathMatch(pathname, protectedPaths);
  const isAuthPage = isPathMatch(pathname, authPaths);

  if (!needsAuth && !isAuthPage) {
    return intlResponse;
  }

  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    const isLoggedIn = !!session?.user;

    // Get the locale from the URL
    const localeMatch = pathname.match(/^\/(tr|en)/);
    const locale = localeMatch ? localeMatch[1] : 'tr';

    if (isLoggedIn && isAuthPage) {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url));
    }

    if (!isLoggedIn && needsAuth) {
      const callbackUrl = encodeURIComponent(pathname);
      return NextResponse.redirect(
        new URL(`/${locale}/join?callbackUrl=${callbackUrl}`, req.url),
      );
    }

    return intlResponse;
  } catch (error) {
    console.error("Middleware auth error:", error);
    const localeMatch = pathname.match(/^\/(tr|en)/);
    const locale = localeMatch ? localeMatch[1] : 'tr';
    if (needsAuth) {
      return NextResponse.redirect(new URL(`/${locale}/join`, req.url));
    }
    return intlResponse;
  }
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/']
};
