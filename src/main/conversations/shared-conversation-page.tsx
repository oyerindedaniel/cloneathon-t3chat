"use client";

import { useParams, useRouter } from "next/navigation";
import React, { useCallback, useRef } from "react";
import { ChatMessage } from "@/components/chat/chat-message";
import { ChatInput } from "@/components/chat/chat-input";
import { MessageSkeleton } from "@/components/chat/message-skeleton";
import {
  useChatMessages,
  useChatConfig,
  useChatControls,
  useChatSessionStatus,
} from "@/contexts/chat-context";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { useErrorAlert } from "@/hooks/use-error-alert";
import { ErrorAlert } from "@/components/error-alert";
import { useAuth } from "@/hooks/use-auth";
import { useConversation } from "@/hooks/use-conversations";
import { api } from "@/trpc/react";
import { flushSync } from "react-dom";
import { toAIMessage, toAIMessages } from "@/lib/utils/message";
import { TypingDots } from "@/components/typing-dots";
import { ForkNotice } from "@/components/fork-notice";
import { AnimatePresence, motion } from "framer-motion";

export default function SharedConversationPage() {
  const { shareId } = useParams<{ shareId: string }>();

  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isNewConversation, setIsNewConversation } = useChatControls();

  const userMessage = useRef<string | null>(null);

  const {
    conversation,
    isLoading: isConversationLoading,
    isError: isConversationError,
    error: conversationError,
    status: conversationStatus,
  } = useConversation({
    id: shareId,
    isNewConversation,
    isSharedLink: true,
  });

  const { reload, status, addToolResult, setMessages, append } =
    useChatMessages();

  const { selectedModel, setSelectedModel } = useChatConfig();
  const { isGuest, remainingMessages, totalMessages, maxMessages } =
    useChatSessionStatus();

  const { messagesEndRef, lastMessageRef, temporarySpaceHeight } =
    useAutoScroll({
      smooth: true,
      messages: conversation?.messages ?? [],
      status,
    });

  const { alertState, hideAlert, handleApiError, resetTimer } = useErrorAlert();

  const forkConversationMutation = api.conversations.forkShared.useMutation({
    onSuccess: (newConversation) => {
      flushSync(() => {
        setIsNewConversation(true);
        if (conversationStatus === "success") {
          setMessages(toAIMessages(conversation?.messages ?? []));
        }
        router.push(`/conversations/${newConversation.id}`);
      });

      if (!!userMessage.current) {
        append({
          role: "user",
          content: userMessage.current,
        });
      }
    },
    onError: (forkError) => {
      handleApiError(forkError, "forking conversation");
    },
  });

  const handleRepromptAndFork = useCallback(
    async (messageContent: string) => {
      if (!messageContent.trim() || status === "streaming" || !isAuthenticated)
        return;

      userMessage.current = messageContent;

      if (!isAuthenticated) {
        console.error("Cannot fork conversation: User not authenticated.");
        return;
      }

      await forkConversationMutation.mutateAsync({
        shareId,
      });
    },
    [status, isAuthenticated, shareId, forkConversationMutation, handleApiError]
  );

  if (isConversationLoading) {
    return (
      <div className="h-full flex flex-col grid-pattern-background px-8">
        <div className="flex-1 py-4 max-w-2xl mx-auto w-full">
          <MessageSkeleton />
        </div>
        <div className="max-md:max-w-2xl max-md:w-full md:w-[min(42rem,_calc(100vw_-_var(--sidebar-width)_-_2rem))] fixed z-100 bottom-6 left-2/4 md:left-[calc((100vw+var(--sidebar-width))/2)] -translate-x-1/2">
          <ChatInput
            onSubmit={() => {}}
            onImageAttach={() => {}}
            selectedModel={selectedModel}
            onModelChange={() => {}}
            disabled={true}
            className="flex-1"
            isGuest={isGuest}
            remainingMessages={remainingMessages}
            totalMessages={totalMessages}
            maxMessages={maxMessages}
          />
        </div>
      </div>
    );
  }

  if (isConversationError) {
    return (
      <div className="h-full flex flex-col grid-pattern-background px-8">
        <ErrorAlert
          isOpen={true}
          variant="fixed"
          onClose={() => router.push("/conversations")}
          title="Shared Conversation Not Found"
          message={
            conversationError?.message ||
            "The shared conversation could not be loaded. It might have been deleted or the link is invalid."
          }
          type="error"
          showResume={false}
          resetTimer={resetTimer}
        />
      </div>
    );
  }

  const messages = conversation?.messages ?? [];

  return (
    <>
      <div className="flex flex-col grid-pattern-background h-full px-8">
        <div className="h-full flex flex-col py-4 max-w-2xl mx-auto w-full pb-[calc(var(--search-height)+3rem)]">
          <div className="flex flex-col gap-12">
            {messages.map((message, index) => (
              <div
                key={message.id}
                ref={index === messages.length - 1 ? lastMessageRef : undefined}
                data-role={message.role}
              >
                <ChatMessage
                  status={status}
                  message={toAIMessage(message)}
                  currentModel={selectedModel}
                  onRetry={() => {}}
                  onModelChange={setSelectedModel}
                  addToolResult={addToolResult}
                />
              </div>
            ))}
            <ErrorAlert
              isOpen={alertState.isOpen}
              onClose={hideAlert}
              title={alertState.title}
              message={alertState.message}
              type={alertState.type}
              onResume={reload}
              showResume={status === "error"}
              resetTimer={resetTimer}
            />
            <AnimatePresence>
              {status === "submitted" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <TypingDots />
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />

            {temporarySpaceHeight > 0 && (
              <div
                style={{ height: `${temporarySpaceHeight}px` }}
                className="pointer-events-none"
                aria-hidden="true"
              />
            )}
          </div>
        </div>

        <div className="max-md:max-w-2xl max-md:w-full md:w-[min(42rem,_calc(100vw_-_var(--sidebar-width)_-_2rem))] fixed bottom-6 left-2/4 md:left-[calc((100vw+var(--sidebar-width))/2)] -translate-x-1/2">
          <ForkNotice
            forkConversationMutation={forkConversationMutation}
            shareId={shareId}
          />

          <ChatInput
            onSubmit={handleRepromptAndFork}
            onImageAttach={() => {}}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            disabled={
              status === "streaming" ||
              status === "submitted" ||
              !isAuthenticated
            }
            className="flex-1"
            onStop={() => {}}
            isGuest={isGuest}
            remainingMessages={remainingMessages}
            totalMessages={totalMessages}
            maxMessages={maxMessages}
          />
        </div>
      </div>
    </>
  );
}
