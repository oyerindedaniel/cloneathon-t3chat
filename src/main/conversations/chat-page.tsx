"use client";

import { useParams } from "react-router-dom";
import { useEffect, useCallback } from "react";
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
import { useSettingsDialog } from "@/hooks/use-settings-dialog";
import { ConnectionStatus } from "@/components/ui/connection-status";
import { useConnectionStatus } from "@/hooks/use-connection-status";

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const { openSettings } = useSettingsDialog();

  const {
    messages,
    append,
    stop,
    reload,
    status,
    error: chatError,
    experimental_resume,
    addToolResult,
  } = useChatMessages();
  const { selectedModel, setSelectedModel } = useChatConfig();
  const { isNavigatingToNewChat, setCurrentConversationId } = useChatControls();
  const {
    isConversationLoading,
    conversationError,
    isConversationError,
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
    conversationError: {
      isError: isConversationError,
      error: conversationError,
    },
    streamStatus: status,
    chatError,
    onResume: reload,
    onOpenSettings: openSettings,
  });

  useEffect(() => {
    if (id && !isNavigatingToNewChat) {
      setCurrentConversationId(id);
    }
  }, [id, setCurrentConversationId, isNavigatingToNewChat]);

  const handleMessageSubmit = useCallback(
    (message: string) => {
      if (!message.trim() || status === "streaming") return;

      try {
        append({
          role: "user",
          content: message,
        });
      } catch (error) {
        handleApiError(error, "sending message");
      }
    },
    [status, handleApiError, append]
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

  // Shows loading skeleton while conversation is loading
  if (isConversationLoading && !isNavigatingToNewChat) {
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

  return (
    <>
      <div className="flex flex-col grid-pattern-background h-full px-8">
        <ConnectionStatus
          isConnected={isConnected}
          isResuming={isResuming}
          onRetry={handleRetryConnection}
        />

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
                  message={message}
                  currentModel={selectedModel}
                  onRetry={handleReload}
                  onModelChange={setSelectedModel}
                  addToolResult={addToolResult}
                />
              </div>
            ))}

            {status === "submitted" && (
              <div className="flex items-center gap-1 mb-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-75" />
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-150" />
              </div>
            )}
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
          <ChatInput
            onSubmit={handleMessageSubmit}
            onImageAttach={handleImageAttach}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            disabled={status === "streaming" || status === "submitted"}
            className="flex-1"
            onStop={handleStop}
            isGuest={isGuest}
            remainingMessages={remainingMessages}
            totalMessages={totalMessages}
            maxMessages={maxMessages}
          />
        </div>
      </div>

      <ErrorAlert
        isOpen={alertState.isOpen}
        onClose={hideAlert}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        onResume={reload}
        showResume={
          status === "error" && alertState.title === "Streaming Error"
        }
        resetTimer={alertState.resetTimer}
      />
    </>
  );
}
