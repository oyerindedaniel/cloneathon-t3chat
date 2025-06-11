import { createAuthClient } from "better-auth/react";
import type { auth } from "@/server/auth/config";

export const authClient = createAuthClient({
  baseURL:
    process.env.NODE_ENV === "production"
      ? process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      : "http://localhost:3000",

  fetchOptions: {
    onError: (e) => {
      if (e.error.status === 429) {
        // Handle rate limiting
        console.warn("Rate limit exceeded. Please slow down.");
      }
    },
  },
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
