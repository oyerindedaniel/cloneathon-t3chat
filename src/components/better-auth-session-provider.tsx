"use client";

import { createContext, useContext, useRef } from "react";
import type { Session, User } from "@/lib/auth-client"; 


type BetterAuthCombinedSession = {
  session: Session;
  user: User;
} | null;

interface BetterAuthSessionContextType {
  initialSession: BetterAuthCombinedSession;
}

const BetterAuthSessionContext = createContext<
  BetterAuthSessionContextType | undefined
>(undefined);

export function BetterAuthSessionProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession: BetterAuthCombinedSession;
}) {
  const initialSessionRef = useRef(initialSession);

  return (
    <BetterAuthSessionContext.Provider
      value={{ initialSession: initialSessionRef.current }}
    >
      {children}
    </BetterAuthSessionContext.Provider>
  );
}

export function useBetterAuthSession() {
  const context = useContext(BetterAuthSessionContext);
  if (context === undefined) {
    throw new Error(
      "useBetterAuthSession must be used within a BetterAuthSessionProvider"
    );
  }
  return context.initialSession;
} 