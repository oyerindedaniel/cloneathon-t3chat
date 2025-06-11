import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./config";

type BetterAuthResponse = Awaited<ReturnType<typeof auth.api.getSession>>;
type User = NonNullable<BetterAuthResponse>["user"];

/**
 * Get the current session on the server-side
 * Use this in server components, API routes, and server actions
 */
export async function getSession(): Promise<BetterAuthResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    return session || null;
  } catch (error) {
    console.error("Failed to get session:", error);
    return null;
  }
}

/**
 * Get the current user on the server-side
 * Returns the user object if authenticated, null otherwise
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user || null;
}

/**
 * Require authentication for server components/actions
 * Redirects to login page if not authenticated
 */
export async function requireAuth(): Promise<{
  session: NonNullable<BetterAuthResponse>;
  user: User;
}> {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  return { session, user: session.user };
}

/**
 * Get session with optional authentication requirement
 * Useful for pages that work for both authenticated and unauthenticated users
 */
export async function getOptionalSession(): Promise<{
  session: BetterAuthResponse;
  user: User | null;
  isAuthenticated: boolean;
}> {
  const session = await getSession();

  return {
    session,
    user: session?.user || null,
    isAuthenticated: !!session?.user,
  };
}

/**
 * Check if user has specific permissions or roles
 * Extend this based on your role/permission system
 */
export async function checkPermissions(permission: string): Promise<boolean> {
  const user = await getCurrentUser();

  if (!user) return false;

  // Add your permission checking logic here
  // For now, just check if user exists
  return true;
}

/**
 * Server action to sign out user
 * Use this in server actions or API routes
 */
export async function signOutServer() {
  try {
    await auth.api.signOut({
      headers: await headers(),
    });
  } catch (error) {
    console.error("Failed to sign out:", error);
    throw error;
  }
}
