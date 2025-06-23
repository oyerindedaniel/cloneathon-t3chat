import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { GitBranch, X } from "lucide-react";
import type { UseMutationResult } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import type { inferRouterOutputs } from "@trpc/server";
import { AppRouter } from "@/server/api/root";
import { TRPCClientErrorLike } from "@trpc/client";

type ConversationsRouterOutput = inferRouterOutputs<AppRouter>["conversations"];

type ForkSharedOutput = ConversationsRouterOutput["forkShared"];

interface ForkNoticeProps {
  forkConversationMutation: UseMutationResult<
    ForkSharedOutput,
    TRPCClientErrorLike<AppRouter>,
    { shareId: string },
    unknown
  >;
  shareId: string;
}

export function ForkNotice({
  forkConversationMutation,
  shareId,
}: ForkNoticeProps) {
  const { isAuthenticated } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);

  return (
    <>
      {!isAuthenticated && !isDismissed && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-md bg-primary/40 border-primary/50 text-white">
          <p className="text-sm">
            You are viewing a shared conversation. Sign in to fork it and
            continue chatting.
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6 hover:bg-background/50"
            onClick={() => setIsDismissed(true)}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {isAuthenticated && (
        <Button
          onClick={() => forkConversationMutation.mutate({ shareId })}
          disabled={forkConversationMutation.isPending}
          className="mb-6"
        >
          {forkConversationMutation.isPending
            ? "Forking..."
            : "Fork Conversation"}
          <GitBranch className="ml-2 h-4 w-4" />
        </Button>
      )}
    </>
  );
}
