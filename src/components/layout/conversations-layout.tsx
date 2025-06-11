"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ConversationsSidebar } from "./conversations-sidebar";
import { Topbar } from "./topbar";
import { GridCross } from "@/components/ui/grid-cross";

interface ConversationsLayoutProps {
  children: React.ReactNode;
  user?: {
    name?: string | null;
    email: string;
    image?: string | null;
  };
}

export function ConversationsLayout({
  children,
  user,
}: ConversationsLayoutProps) {
  return (
    <div className="min-h-screen auth-grid-background">
      <GridCross position="tl" opacity={0.1} />
      <GridCross position="tr" opacity={0.1} />
      <GridCross position="bl" opacity={0.1} />
      <GridCross position="br" opacity={0.1} />

      <SidebarProvider>
        <ConversationsSidebar />
        <SidebarInset className="relative">
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="w-full h-full opacity-[0.02]"
              style={{
                background: `
                  radial-gradient(circle at 20% 20%, var(--color-primary) 0%, transparent 50%),
                  radial-gradient(circle at 80% 80%, var(--color-provider-openai) 0%, transparent 50%),
                  radial-gradient(circle at 40% 90%, var(--color-provider-anthropic) 0%, transparent 50%)
                `,
              }}
            />
          </div>

          <div className="flex flex-col h-full relative z-10">
            <Topbar user={user} />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
