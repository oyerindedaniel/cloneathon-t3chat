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
import LoginPage from "@/pages/auth/login-page";
import SignupPage from "@/pages/auth/signup-page";
import ConversationsPage from "@/pages/conversations/conversations-page";
import ChatPage from "@/pages/conversations/chat-page";
import { ThemeProvider } from "./theme-provider";
import { ChatProvider } from "@/contexts/chat-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";

function ConversationsWrapper() {
  const { user } = useAuth();

  return (
    <ConversationsLayout user={user}>
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
          <ChatProvider>
            <KeyboardShortcuts />
            <Routes>
              <Route
                path="/"
                element={<Navigate to="/conversations" replace />}
              />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/conversations" element={<ConversationsWrapper />}>
                <Route index element={<ConversationsPage />} />
                <Route path=":id" element={<ChatPage />} />
              </Route>
            </Routes>
          </ChatProvider>
        </TooltipProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
