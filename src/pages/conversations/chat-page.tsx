import { useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "@/components/chat/chat-message";
import { ChatInput } from "@/components/chat/chat-input";
import { MessageSkeleton } from "@/components/chat/message-skeleton";
import { useChatContext } from "@/contexts/chat-context";
import { useSession } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";
import { useAutoScroll } from "@/hooks/use-auto-scroll";

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const session = useSession();

  const { messagesEndRef, lastMessageRef, handleNewMessage } = useAutoScroll({
    topbarHeight: 64,
    maxQuestionLines: 3,
    lineHeight: 24,
    smooth: true,
  });

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    stop,
    reload,
    selectedModel,
    setSelectedModel,
    isNavigatingToNewChat,
    setCurrentConversationId,
    setMessages,
    status,
  } = useChatContext();

  const shouldFetchConversation = !!id && !isNavigatingToNewChat;

  console.log({ id });

  const {
    data: conversation,
    isLoading: conversationLoading,
    isError,
    error,
    status: conversationStatus,
  } = api.conversations.getById.useQuery(
    { id: id! },
    {
      enabled: shouldFetchConversation && !!session,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: 1,
      retryDelay: 1000,
    }
  );

  console.log({
    messages,
  });

  const prevMessagesLength = useRef(messages.length);

  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      const lastMessage = messages[messages.length - 1];
      const isNewUserMessage = lastMessage?.role === "user";

      handleNewMessage(isNewUserMessage);

      prevMessagesLength.current = messages.length;
    }
  }, [messages, handleNewMessage]);

  useEffect(() => {
    if (isError && error.data?.code === "NOT_FOUND") {
      console.log("NOT_FOUND");
      navigate("/conversations");
    }
  }, [isError, error]);

  useEffect(() => {
    if (conversationStatus === "success" && conversation?.messages.length > 0) {
      const formattedMessages = conversation.messages.map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
        createdAt: new Date(msg.createdAt),
      }));

      setMessages(formattedMessages);
    }
  }, [conversationStatus]);

  useEffect(() => {
    setCurrentConversationId(id!);
  }, []);

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || status === "streaming") return;
    handleSubmit(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const formEvent = new Event("submit", {
        bubbles: true,
        cancelable: true,
      }) as unknown as React.FormEvent<HTMLFormElement>;
      handleFormSubmit(formEvent);
    }
  };

  const handleReload = () => {
    reload();
  };

  const handleImageAttach = () => {
    // TODO: Implement image attachment functionality
    console.log("Image attach clicked");
  };

  if (conversationLoading) {
    return (
      <div className="h-full flex flex-col grid-pattern-background px-8">
        <div className="flex-1 py-4 max-w-2xl mx-auto w-full">
          <MessageSkeleton />
        </div>

        <div className="max-md:max-w-2xl max-md:w-full md:w-[min(42rem,_calc(100vw_-_var(--sidebar-width)_-_2rem))] fixed bottom-6 left-2/4 md:left-[calc((100vw+var(--sidebar-width))/2)] -translate-x-1/2">
          <ChatInput
            value=""
            onChange={() => {}}
            onKeyDown={() => {}}
            onSubmit={() => {}}
            onImageAttach={() => {}}
            selectedModel={selectedModel}
            onModelChange={() => {}}
            disabled={true}
            className="flex-1"
          />
        </div>
      </div>
    );
  }

  if (shouldFetchConversation && !conversationLoading && !conversation) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-foreground-muted">Conversation not found</p>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  console.log({ messages });

  return (
    <div className="flex flex-col grid-pattern-background h-full px-8">
      <div className="h-full flex flex-col py-4 max-w-2xl mx-auto w-full pb-[calc(var(--search-height)+1rem)]">
        <div className="flex flex-col gap-12">
          {messages.map((message, index) => (
            <div
              key={message.id || index}
              ref={index === messages.length - 1 ? lastMessageRef : undefined}
              data-role={message.role}
            >
              <ChatMessage message={message} />
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        {status === "submitted" && (
          <div className="flex items-center gap-1 mb-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-75" />
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-150" />
          </div>
        )}
      </div>

      <div className="max-md:max-w-2xl max-md:w-full md:w-[min(42rem,_calc(100vw_-_var(--sidebar-width)_-_2rem))] fixed bottom-6 left-2/4 md:left-[calc((100vw+var(--sidebar-width))/2)] -translate-x-1/2">
        <ChatInput
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onSubmit={handleFormSubmit}
          onImageAttach={handleImageAttach}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          disabled={status === "streaming" || status === "submitted"}
          className="flex-1"
        />
      </div>
    </div>
  );
}
