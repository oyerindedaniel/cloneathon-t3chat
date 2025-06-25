"use client";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { ConversationsLayout } from "@/components/layout/conversations-layout";
import { useAuth } from "@/hooks/use-auth";
import LoginPage from "@/main/auth/login-page";
import SignupPage from "@/main/auth/signup-page";
import ConversationsPage from "@/main/conversations/conversations-page";
import ChatPage from "@/main/conversations/chat-page";
import { ThemeProvider } from "./theme-provider";
import { ChatProvider } from "@/contexts/chat-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { GuestStorageProvider } from "@/contexts/guest-storage-context";
import { SettingsProvider } from "@/contexts/settings-context";
import SharedConversationPage from "@/main/conversations/shared-conversation-page";

function ConversationsWrapper() {
  return (
    <ConversationsLayout>
      <Outlet />
    </ConversationsLayout>
  );
}

export default function ChatApp() {
  return (
    <BrowserRouter>
      <ThemeProvider
        attribute="data-theme"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider>
          <GuestStorageProvider>
            <SettingsProvider>
              <ChatProvider>
                <KeyboardShortcuts />
                <Routes>
                  <Route
                    path="/"
                    element={<Navigate to="/conversations" replace />}
                  />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route
                    path="/conversations"
                    element={<ConversationsWrapper />}
                  >
                    <Route index element={<ConversationsPage />} />
                    <Route path=":id" element={<ChatPage />} />
                    <Route
                      path="share/:shareId"
                      element={<SharedConversationPage />}
                    />
                  </Route>
                </Routes>
              </ChatProvider>
            </SettingsProvider>
          </GuestStorageProvider>
        </TooltipProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
