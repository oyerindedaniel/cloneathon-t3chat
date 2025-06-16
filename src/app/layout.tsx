import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { auth } from '@/server/auth/config';
import { BetterAuthSessionProvider } from "@/components/better-auth-session-provider";
import { headers } from 'next/headers';

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

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <BetterAuthSessionProvider initialSession={session}>
          {children}
        </BetterAuthSessionProvider>
      </body>
    </html>
  );
}
