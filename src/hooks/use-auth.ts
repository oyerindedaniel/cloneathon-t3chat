import { authClient, type Session, type User } from "@/lib/auth-client";
import { useBetterAuthSession } from "@/components/better-auth-session-provider";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export type BetterAuthCombinedSession = {
  session: Session;
  user: User;
} | null;

/**
 * Custom hook for authentication state and actions
 */
export function useAuth() {
  const navigate = useNavigate();

  const initialSession = useBetterAuthSession();

  const {
    data: clientSessionData,
    isPending,
    error,
    refetch,
  } = authClient.useSession();

  const sessionData = clientSessionData ?? initialSession;

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
          navigate(data.callbackURL || "/conversations");
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
          navigate(data.callbackURL || "/conversations");
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
          navigate(data.callbackURL || "/conversations");
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
          navigate(redirectTo || "/login");
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
    session: sessionData?.session,
    user: sessionData?.user,
    isLoading: isPending,
    error,
    isAuthenticated: !!sessionData?.user,

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
  return session || null;
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
