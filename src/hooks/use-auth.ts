import { useRouter } from "next/navigation";
import { authClient, type Session, type User } from "@/lib/auth-client";

/**
 * Custom hook for authentication state and actions
 * Provides a composable interface for auth operations
 */
export function useAuth() {
  const router = useRouter();

  // Get session data using Better Auth's useSession hook
  const { data: session, isPending, error, refetch } = authClient.useSession();

  /**
   * Sign up a new user with email and password
   */
  const signUp = async (data: {
    email: string;
    password: string;
    name: string;
    callbackURL?: string;
  }) => {
    return await authClient.signUp.email(
      {
        email: data.email,
        password: data.password,
        name: data.name,
        callbackURL: data.callbackURL || "/conversations",
      },
      {
        onSuccess: () => {
          router.push(data.callbackURL || "/conversations");
        },
        onError: (ctx) => {
          console.error("Sign up error:", ctx.error.message);
        },
      }
    );
  };

  /**
   * Sign in an existing user with email and password
   */
  const signIn = async (data: {
    email: string;
    password: string;
    rememberMe?: boolean;
    callbackURL?: string;
  }) => {
    return await authClient.signIn.email(
      {
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe ?? true,
        callbackURL: data.callbackURL || "/conversations",
      },
      {
        onSuccess: () => {
          router.push(data.callbackURL || "/conversations");
        },
        onError: (ctx) => {
          console.error("Sign in error:", ctx.error.message);
        },
      }
    );
  };

  /**
   * Sign in with OAuth provider (GitHub, Google)
   */
  const signInWithOAuth = async (data: {
    provider: "github" | "google";
    callbackURL?: string;
  }) => {
    return await authClient.signIn.social(
      {
        provider: data.provider,
        callbackURL: data.callbackURL || "/conversations",
      },
      {
        onSuccess: () => {
          router.push(data.callbackURL || "/conversations");
        },
        onError: (ctx) => {
          console.error(`${data.provider} sign in error:`, ctx.error.message);
        },
      }
    );
  };

  /**
   * Sign in with GitHub
   */
  const signInWithGitHub = async (callbackURL?: string) => {
    return signInWithOAuth({ provider: "github", callbackURL });
  };

  /**
   * Sign in with Google
   */
  const signInWithGoogle = async (callbackURL?: string) => {
    return signInWithOAuth({ provider: "google", callbackURL });
  };

  /**
   * Sign out the current user
   */
  const signOut = async (redirectTo?: string) => {
    return await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push(redirectTo || "/login");
        },
      },
    });
  };

  /**
   * Update user profile information
   */
  const updateUser = async (data: {
    name?: string;
    image?: string;
    [key: string]: unknown;
  }) => {
    return await authClient.updateUser(data);
  };

  /**
   * Delete the current user account
   */
  const deleteAccount = async (password?: string) => {
    return await authClient.deleteUser(password ? { password } : {});
  };

  /**
   * Get fresh session data
   */
  const getSession = async () => {
    return await authClient.getSession();
  };

  return {
    // Session state
    session,
    user: session?.user,
    isLoading: isPending,
    error,
    isAuthenticated: !!session?.user,

    // Email/Password Actions
    signUp,
    signIn,

    // OAuth Actions
    signInWithOAuth,
    signInWithGitHub,
    signInWithGoogle,

    // Common Actions
    signOut,
    updateUser,
    deleteAccount,
    getSession,
    refetchSession: refetch,
  };
}

/**
 * Hook for accessing just the user data
 */
export function useUser(): User | null {
  const { user } = useAuth();
  return user || null;
}

/**
 * Hook for accessing just the session data
 */
export function useSession(): Session | null {
  const { session } = useAuth();
  return session?.session || null;
}

/**
 * Hook that provides authentication state helpers
 */
export function useAuthState() {
  const { isAuthenticated, isLoading, user } = useAuth();

  return {
    isAuthenticated,
    isLoading,
    isGuest: !isAuthenticated && !isLoading,
    userId: user?.id,
    userEmail: user?.email,
    userName: user?.name,
    userImage: user?.image,
  };
}
