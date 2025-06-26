import { useEffect, useRef } from "react";
import { useChat as useAIChat } from "@ai-sdk/react";
import { createIdGenerator, Message } from "ai";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useLatestValue } from "@/hooks/use-latest-value";
import { useGuestStorage } from "@/contexts/guest-storage-context";
import { useConversation } from "@/hooks/use-conversations";
import { toAIMessages } from "@/lib/utils/message";
import { Message as AIMessage } from "ai/react";
import { LocationToolCall, AllToolResults } from "./chat-context";
import React from "react";

const messageIdGenerator = createIdGenerator({
  prefix: "msgc",
  size: 16,
});

interface UseChatInstanceProps {
  conversationId: string;
  isWebSearchEnabled: boolean;
  selectedModel: string;
  isGuest: boolean;
  onChatReady: (conversationId: string, chatHelpers: any) => void;
  onFinish: (conversationId: string, message: Message) => void;
  onToolCall: (conversationId: string, toolCall: LocationToolCall) => void;
  onAppend: (
    conversationId: string,
    message: Omit<AIMessage, "id"> | Omit<AIMessage, "id">[]
  ) => void;
}

export function useChatInstance({
  conversationId,
  isWebSearchEnabled,
  selectedModel,
  isGuest,
  onChatReady,
  onFinish,
  onToolCall,
  onAppend,
}: UseChatInstanceProps) {
  const guestStorage = useGuestStorage();
  const currentConversationIdRef = useLatestValue(conversationId);
  const isWebSearchEnabledRef = useLatestValue(isWebSearchEnabled);
  const selectedModelRef = useLatestValue(selectedModel);

  const {
    conversation,
    status: conversationStatus,
    isLoading: conversationLoading,
  } = useConversation({ id: conversationId, isNewConversation: false });

  const initialMessages = React.useMemo<AIMessage[]>(() => {
    if (isGuest && conversationId) {
      const guestConversation = guestStorage.getConversation(conversationId);
      return guestConversation?.messages || [];
    }

    if (conversation?.messages) {
      return toAIMessages(conversation.messages);
    }
    return [];
  }, [conversation, conversationId, isGuest, guestStorage]);

  const chat = useAIChat({
    api: "/api/chat",
    initialMessages,
    sendExtraMessageFields: true,
    generateId: messageIdGenerator,
    maxSteps: 5,
    experimental_prepareRequestBody: ({ messages }) => {
      return {
        message: messages[messages.length - 1],
        id: currentConversationIdRef.current,
        isWebSearchEnabled: isWebSearchEnabledRef.current,
        modelId: selectedModelRef.current,
        userLocation: {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };
    },
    onResponse: async (response) => {
      if (!response.ok) {
        const errorText = await response.text();
        console.log("Chat API error in context:", response.status, errorText);
        throw new Error(`Chat API error: ${response.status}`);
      }
    },
    onFinish: (message) => {
      onFinish(conversationId, message);
    },
    onToolCall: ({ toolCall }) => {
      if (toolCall.toolName === "getLocation") {
        onToolCall(conversationId, toolCall as LocationToolCall);
      }
    },
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  // Auto-resume functionality
  useAutoResume({
    autoResume: !isGuest && !!conversationId,
    initialMessages: chat.messages,
    experimental_resume: chat.experimental_resume,
    data: chat.data,
    setMessages: chat.setMessages,
  });

  // Register chat instance when ready and handle message updates
  useEffect(() => {
    onChatReady(conversationId, chat);

    // Handle message changes for onAppend callback
    const currentMessages = chat.messages;
    if (currentMessages.length > 0) {
      // Only call onAppend for new messages, not initial load
      const lastMessage = currentMessages[currentMessages.length - 1];
      if (lastMessage && !lastMessage.id.startsWith("initial-")) {
        // This ensures we don't double-append on initial load
        onAppend(conversationId, lastMessage);
      }
    }
  }, [conversationId, chat, onChatReady, onAppend, chat.messages]);

  // Handle conversation loading and message synchronization
  useEffect(() => {
    if (conversationStatus === "success" && !conversationLoading) {
      const messagesToSet = initialMessages.length > 0 ? initialMessages : [];
      const shouldUpdateMessages =
        chat.messages.length !== messagesToSet.length ||
        (messagesToSet.length > 0 &&
          messagesToSet[messagesToSet.length - 1]?.id !==
            chat.messages[chat.messages.length - 1]?.id);

      if (shouldUpdateMessages) {
        chat.setMessages(messagesToSet);
      }
    }
  }, [
    conversationId,
    conversationStatus,
    conversationLoading,
    initialMessages,
    chat.messages,
    chat.setMessages,
  ]);

  return chat;
}
