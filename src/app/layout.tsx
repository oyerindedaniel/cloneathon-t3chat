import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { auth } from "@/server/auth/config";
import { BetterAuthSessionProvider } from "@/components/better-auth-session-provider";
import { CONVERSATION_QUERY_LIMIT } from "@/constants/conversations";
import { headers } from "next/headers";
import { TRPCReactProvider } from "@/trpc/react";
import { api, HydrateClient, caller } from "@/trpc/server";
import { dehydrate, QueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { ToastProvider } from "@/contexts/toast-context";
import { ToastDisplay } from "@/components/ui/toast-display";

import "./globals.css";
import "./syntax-highlighter.css";
import "katex/dist/katex.min.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "T3 Chat Cloneathon - AI Chat Experience",
  description: "High-performance AI chat application built with T3 Stack",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const allHeaders = await headers();
  const requestHeaders = new Headers();
  for (const [key, value] of allHeaders.entries()) {
    requestHeaders.append(key, value);
  }
  const session = await auth.api.getSession({ headers: requestHeaders });

  console.log("better auth session---------", session);

  const queryClient = new QueryClient();

  // queryKey: getQueryKey(
  //   api.conversations.getAll,
  //   { limit: CONVERSATION_QUERY_LIMIT },
  //   "infinite"
  // ),

  const queryKey = [
    "conversations.getAll",
    { limit: CONVERSATION_QUERY_LIMIT },
  ];
  await queryClient.prefetchInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }) =>
      api.conversations.getAll({
        limit: CONVERSATION_QUERY_LIMIT,
        cursor: pageParam,
      }),
    initialPageParam: undefined,
  });

  const dehydratedState = dehydrate(queryClient);

  return (
    <html lang="en">
      <head>
        {process.env.NODE_ENV !== "production" && (
          <script
            src="https://unpkg.com/react-scan/dist/auto.global.js"
            async
          />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ToastProvider>
          <BetterAuthSessionProvider initialSession={session}>
            <TRPCReactProvider dehydratedState={dehydratedState}>
              {children}
            </TRPCReactProvider>
          </BetterAuthSessionProvider>
          <ToastDisplay />
        </ToastProvider>
      </body>
    </html>
  );
}
