"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ConversationsSidebar } from "./conversations-sidebar";
import { Topbar } from "./topbar";

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
    <div className="min-h-screen">
      <SidebarProvider>
        <ConversationsSidebar />
        <SidebarInset className="relative">
          <div className="flex flex-col h-full relative z-10">
            <Topbar user={user} />
            <main className="flex-1 overflow-auto pt-[calc(var(--topbar-height))] h-full">
              {children}
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
