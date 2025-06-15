import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth/config";

const protectedRoutes = ["/api/conversations", "/api/messages", "/api/user"];

const authRoutes = ["/login", "/signup"];

const guestAccessibleRoutes = [
  "/conversations",
  "/api/chat",
  "/api/generate-title",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/auth/") || pathname.startsWith("/_next/")) {
    return NextResponse.next();
  }

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  const isAuthRoute = authRoutes.some((route) => pathname === route);

  const isGuestAccessible = guestAccessibleRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtectedRoute && !isAuthRoute) {
    return NextResponse.next();
  }

  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    const isAuthenticated = !!session?.user;

    if (isAuthRoute && isAuthenticated) {
      return NextResponse.redirect(new URL("/conversations", request.url));
    }

    if (isProtectedRoute && !isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware auth error:", error);

    if (isProtectedRoute && !isGuestAccessible) {
      // Check if this might be a temporary database issue
      // by looking at the error message
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        errorMessage.includes("Failed query") ||
        errorMessage.includes("INTERNAL_SERVER_ERROR")
      ) {
        console.warn(
          "Database connectivity issue in middleware, allowing request to proceed"
        );

        const criticalRoutes = [
          "/api/user",
          "/api/conversations",
          "/api/messages",
        ];
        const isCriticalRoute = criticalRoutes.some((route) =>
          pathname.startsWith(route)
        );

        if (isCriticalRoute) {
          return NextResponse.redirect(new URL("/login", request.url));
        }
      } else {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }

    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
