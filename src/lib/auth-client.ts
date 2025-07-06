import { createAuthClient } from "better-auth/react";
import type { auth } from "@/server/auth/config";
import { getBaseUrl } from "./utils/app";

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
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
