import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { cookies } from "next/headers";
import type { OpenRouterKeyInfo } from "@/lib/utils/openrouter-errors";
import { API_KEY_PROVIDERS } from "@/lib/ai/providers";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 60 * 60 * 24 * 30, // 30 days
  path: "/",
};

export const apiKeysRouter = createTRPCRouter({
  hasApiKey: publicProcedure
    .input(z.object({ provider: z.enum(API_KEY_PROVIDERS) }))
    .query(async ({ input }) => {
      const cookieStore = await cookies();
      const apiKey = cookieStore.get(`apikey_${input.provider}`);

      return {
        hasKey: !!apiKey?.value,
        provider: input.provider,
      };
    }),

  getApiKey: publicProcedure
    .input(z.object({ provider: z.enum(API_KEY_PROVIDERS) }))
    .query(async ({ input }) => {
      const cookieStore = await cookies();
      const apiKey = cookieStore.get(`apikey_${input.provider}`);

      return {
        key: apiKey?.value || null,
        provider: input.provider,
      };
    }),

  getApiKeyInfo: publicProcedure
    .input(z.object({ provider: z.enum(API_KEY_PROVIDERS) }))
    .query(async ({ input }) => {
      const cookieStore = await cookies();
      const apiKey = cookieStore.get(`apikey_${input.provider}`);

      if (!apiKey?.value) {
        return {
          hasKey: false,
          provider: input.provider,
          info: null,
        };
      }

      try {
        const response = await fetch("https://openrouter.ai/api/v1/key", {
          headers: {
            Authorization: `Bearer ${apiKey.value}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const keyInfo: OpenRouterKeyInfo = await response.json();

        return {
          hasKey: true,
          provider: input.provider,
          info: keyInfo.data,
        };
      } catch (error) {
        console.error("Failed to fetch API key info:", error);
        return {
          hasKey: true,
          provider: input.provider,
          info: null,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  setApiKey: publicProcedure
    .input(
      z.object({
        provider: z.enum(API_KEY_PROVIDERS),
        key: z.string().min(1, "API key cannot be empty"),
      })
    )
    .mutation(async ({ input }) => {
      const cookieStore = await cookies();

      cookieStore.set(`apikey_${input.provider}`, input.key, COOKIE_OPTIONS);

      return {
        success: true,
        provider: input.provider,
      };
    }),

  removeApiKey: publicProcedure
    .input(z.object({ provider: z.enum(API_KEY_PROVIDERS) }))
    .mutation(async ({ input }) => {
      const cookieStore = await cookies();

      cookieStore.delete(`apikey_${input.provider}`);

      return {
        success: true,
        provider: input.provider,
      };
    }),
});
