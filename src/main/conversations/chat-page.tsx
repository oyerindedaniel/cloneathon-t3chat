"use client";

import { useParams } from "react-router-dom";
import { useCallback } from "react";
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
import { ConnectionStatus } from "@/components/ui/connection-status";
import { useConnectionStatus } from "@/hooks/use-connection-status";
import { TypingDots } from "@/components/typing-dots";
import { AnimatePresence, motion } from "framer-motion";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsomorphicLayoutEffect } from "@/hooks/use-Isomorphic-layout-effect";
import { useNavigate } from "react-router-dom";

export default function ChatPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { open } = useSidebar();
  const navigate = useNavigate();
  const state = open ? "expanded" : "collapsed";

  const { messages, stop, reload, status, experimental_resume, addToolResult } =
    useChatMessages();
  const { selectedModel, setSelectedModel } = useChatConfig();
  const {
    isNewConversation,
    handleChatPageOnLoad,
    handleNewMessage,
    skipInitialChatLoadRef,
  } = useChatControls();
  const {
    isConversationLoading,
    isGuest,
    remainingMessages,
    totalMessages,
    maxMessages,
  } = useChatSessionStatus();

  const { messagesEndRef, lastMessageRef, temporarySpaceHeight } =
    useAutoScroll({
      smooth: true,
      messages,
      status,
    });

  const { isConnected, isResuming, startResuming, stopResuming } =
    useConnectionStatus();

  const { alertState, hideAlert, handleApiError } = useErrorAlert({
    conversationId: id,
  });

  useIsomorphicLayoutEffect(() => {
    if (skipInitialChatLoadRef.current) {
      skipInitialChatLoadRef.current = false;
      return;
    }

    if (id && !isNewConversation) {
      handleChatPageOnLoad(id);
    }
  }, [id, isNewConversation, handleChatPageOnLoad]);

  const handleMessageSubmit = useCallback(
    (message: string) => {
      if (!message.trim() || status === "streaming") return;

      try {
        handleNewMessage(message);
      } catch (error) {
        handleApiError(error, "sending message");
      }
    },
    [status, handleNewMessage, handleApiError]
  );

  const handleReload = () => {
    try {
      reload();
    } catch (error) {
      handleApiError(error, "reloading conversation");
    }
  };

  const handleStop = () => {
    try {
      stop();
    } catch (error) {
      handleApiError(error, "stopping generation");
    }
  };

  const handleImageAttach = () => {
    console.log("Image attach clicked");
  };

  const handleRetryConnection = useCallback(() => {
    if (!isConnected && experimental_resume) {
      startResuming();
      try {
        experimental_resume();
        stopResuming();
      } catch (error) {
        console.error("Failed to resume:", error);
        stopResuming();
      }
    }
  }, [isConnected, experimental_resume, startResuming, stopResuming]);

  if (isConversationLoading && !isNewConversation) {
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

  const isLastMessageUsers = messages && messages.at(-1)?.role === "user";

  const activeStreamingStatus =
    status === "streaming" || status === "submitted";

  return (
    <div className="flex flex-col grid-pattern-background h-full px-8">
      <ConnectionStatus
        isConnected={isConnected}
        isResuming={isResuming}
        onRetry={isLastMessageUsers ? handleRetryConnection : undefined}
      />

      <div className="h-full flex flex-col py-4 max-w-2xl mx-auto w-full pb-[calc(var(--search-height)+4rem)]">
        <div className="flex flex-col gap-12">
          {messages.map((message, index) => (
            <div key={message.id}>
              <div
                ref={index === messages.length - 1 ? lastMessageRef : undefined}
                data-role={message.role}
              >
                <ChatMessage
                  status={status}
                  message={message}
                  currentModel={selectedModel}
                  onRetry={handleReload}
                  onModelChange={setSelectedModel}
                  addToolResult={addToolResult}
                />
              </div>
              {index === messages.length - 1 && (
                <ErrorAlert
                  isOpen={
                    alertState.isOpen &&
                    !activeStreamingStatus &&
                    status === "error"
                  }
                  onClose={async () => {
                    hideAlert();
                    await reload();
                  }}
                  title={alertState.title}
                  message={alertState.message}
                  type={alertState.type}
                  onResume={reload}
                  showResume
                />
              )}
            </div>
          ))}

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

      <div
        data-state={state}
        className="max-md:max-w-2xl max-md:w-full data-[state=collapsed]:!max-w-2xl data-[state=collapsed]:!w-full data-[state=collapsed]:!left-2/4 md:w-[min(42rem,_calc(100vw_-_var(--sidebar-width)_-_2rem))] fixed bottom-6 left-2/4 md:left-[calc((100vw+var(--sidebar-width))/2)] -translate-x-1/2"
      >
        <ErrorAlert
          className="mb-3"
          isOpen={alertState.isOpen && status !== "error"}
          onClose={() => {
            hideAlert();
            navigate("/conversations");
          }}
          title={alertState.title}
          message={alertState.message}
          type={alertState.type}
        />
        <ChatInput
          onSubmit={handleMessageSubmit}
          onImageAttach={handleImageAttach}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          disabled={activeStreamingStatus}
          className="flex-1"
          onStop={handleStop}
          isGuest={isGuest}
          remainingMessages={remainingMessages}
          totalMessages={totalMessages}
          maxMessages={maxMessages}
        />
      </div>
    </div>
  );
}
