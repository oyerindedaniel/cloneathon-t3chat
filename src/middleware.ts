import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const protectedRoutes: string[] = [];
const authRoutes = ["/login", "/signup"];
const guestAccessibleRoutes = ["/conversations"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));
  const isAuthRoute = authRoutes.includes(pathname);
  const isGuestAccessible = guestAccessibleRoutes.some((r) =>
    pathname.startsWith(r)
  );

  const sessionCookie = getSessionCookie(request);
  const isAuthenticated = Boolean(sessionCookie);

  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/conversations", request.url));
  }

  if (isProtected && !isAuthenticated && !isGuestAccessible) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)",
  ],
};
