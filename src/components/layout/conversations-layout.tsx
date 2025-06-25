"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ConversationsSidebar } from "./conversations-sidebar";
import { Topbar } from "./topbar";
import { SettingsDialog } from "@/components/settings-dialog";

interface ConversationsLayoutProps {
  children: React.ReactNode;
}

export function ConversationsLayout({ children }: ConversationsLayoutProps) {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <SidebarProvider>
        <ConversationsSidebar />
        <SidebarInset>
          <div className="flex flex-col h-full z-10">
            <Topbar />
            <main className="flex-1 overflow-hidden overflow-x-auto pt-[calc(var(--topbar-height))] w-full h-full">
              {children}
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
      <SettingsDialog />
    </div>
  );
}
