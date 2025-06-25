"use client";

import {
  SidebarProvider,
  SidebarInset,
  Sidebar,
} from "@/components/ui/sidebar";
import { ConversationsSidebar } from "./conversations-sidebar";
import { Topbar } from "./topbar";
import { SettingsDialog } from "@/components/settings-dialog";

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
    <div className="min-h-screen overflow-x-hidden">
      <SidebarProvider>
        <ConversationsSidebar />
        <SidebarInset>
          <div className="flex flex-col h-full z-10">
            <Topbar user={user} />
            <main className="flex-1 overflow-hidden overflow-x-auto pt-[calc(var(--topbar-height))] md:w-[calc(100vw-var(--sidebar-width))] h-full">
              {children}
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
      <SettingsDialog />
    </div>
  );
}
