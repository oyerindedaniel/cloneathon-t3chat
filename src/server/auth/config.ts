import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verification,
    },
  }),

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false, // Set to true if you want email verification
  },

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      redirectURI: `${
        process.env.NODE_ENV === "production"
          ? process.env.NEXTAUTH_URL || "http://localhost:3000"
          : "http://localhost:3000"
      }/api/auth/callback/github`,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectURI: `${
        process.env.NODE_ENV === "production"
          ? process.env.NEXTAUTH_URL || "http://localhost:3000"
          : "http://localhost:3000"
      }/api/auth/callback/google`,
      scope: ["openid", "email", "profile"],
    },
  },

  user: {
    additionalFields: {
      avatarUrl: {
        type: "string",
        required: false,
      },
    },
    deleteUser: {
      enabled: true,
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
    crossSubDomainCookies: {
      enabled: false,
    },
  },

  // Rate limiting for security
  rateLimit: {
    window: 60, // 1 minute
    max: 100, // 100 requests per minute
  },

  // Security headers
  trustedOrigins: [
    process.env.NODE_ENV === "production"
      ? process.env.NEXTAUTH_URL || "http://localhost:3000"
      : "http://localhost:3000",
  ],
});
