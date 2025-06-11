"use client";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { TRPCReactProvider } from "@/trpc/react";
import { ConversationsLayout } from "@/components/layout/conversations-layout";
import { useAuth } from "@/hooks/use-auth";
import LoginPage from "@/pages/auth/login-page";
import SignupPage from "@/pages/auth/signup-page";
import ConversationsPage from "@/pages/conversations/conversations-page";
import ChatPage from "@/pages/conversations/chat-page";
import { ModeToggler } from "./mode-toggler";

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
    <TRPCReactProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/conversations" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/conversations" element={<ConversationsWrapper />}>
            <Route index element={<ConversationsPage />} />
            <Route path=":id" element={<ChatPage />} />
          </Route>
        </Routes>
        <ModeToggler />
      </BrowserRouter>
    </TRPCReactProvider>
  );
}
