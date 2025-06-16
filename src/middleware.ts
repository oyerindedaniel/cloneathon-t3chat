import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth/config";

const protectedRoutes: string[] = [];

const authRoutes = ["/login", "/signup"];

const guestAccessibleRoutes = ["/conversations"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  const isAuthRoute = authRoutes.includes(pathname);
  const isGuestAccessible = guestAccessibleRoutes.some((route) =>
    pathname.startsWith(route)
  );

  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    // console.log("------------------------------middleware", session);

    const isAuthenticated = !!session?.user;

    if (isAuthRoute && isAuthenticated) {
      return NextResponse.redirect(new URL("/conversations", request.url));
    }

    if (isProtectedRoute && !isAuthenticated && !isGuestAccessible) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  } catch (error) {
    console.log("------------------------------middleware error", error);
    console.error("Middleware auth error:", error);

    if (isProtectedRoute && !isGuestAccessible) {
      // Check if this might be a temporary database issue

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        errorMessage.includes("Failed query") ||
        errorMessage.includes("INTERNAL_SERVER_ERROR")
      ) {
        console.warn(
          "Database connectivity issue in middleware, allowing request to proceed"
        );

        return NextResponse.redirect(new URL("/conversations", request.url));
      } else {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }

    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)",
  ],
};
