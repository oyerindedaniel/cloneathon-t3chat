import { useEffect, useMemo } from "react";
import { useChat as useAIChat } from "@ai-sdk/react";
import { createIdGenerator, Message } from "ai";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useLatestValue } from "@/hooks/use-latest-value";
import { useGuestStorage } from "@/contexts/guest-storage-context";
import { useConversation } from "@/hooks/use-conversations";
import { toAIMessages } from "@/lib/utils/message";
import { Message as AIMessage } from "ai/react";
import type { LocationToolCall, ChatHelpers } from "./types";

const messageIdGenerator = createIdGenerator({
  prefix: "msgc",
  size: 16,
});

let count = 0;

interface UseChatInstanceProps {
  conversationId: string;
  isWebSearchEnabled: boolean;
  isNewConversation: boolean;
  selectedModel: string;
  isGuest: boolean;
  onChatReady: (conversationId: string, chatHelpers: ChatHelpers) => void;
  onFinish: (conversationId: string, message: Message) => void;
  onToolCall: (conversationId: string, toolCall: LocationToolCall) => void;
}

export function useChatInstance({
  conversationId,
  isWebSearchEnabled,
  isNewConversation,
  selectedModel,
  isGuest,
  onChatReady,
  onFinish,
  onToolCall,
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

  const initialMessages = useMemo<AIMessage[]>(() => {
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
        message: messages.at(-1),
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

  useAutoResume({
    autoResume: !isGuest && !!conversationId,
    initialMessages: chat.messages,
    experimental_resume: chat.experimental_resume,
    data: chat.data,
    setMessages: chat.setMessages,
  });

  useEffect(() => {
    console.log("on chat ready useeffect", {
      conversationId,
      count: count + 1,
    });
    onChatReady(conversationId, chat);
  }, [conversationId, chat]);

  useEffect(() => {
    if (
      conversationStatus !== "success" ||
      conversationLoading ||
      isNewConversation
    )
      return;

    const messagesToSet = initialMessages ?? [];
    const lastInitialMessageId = messagesToSet.at(-1)?.id;
    const lastChatMessageId = chat.messages.at(-1)?.id;

    const shouldUpdateMessages =
      chat.messages.length !== messagesToSet.length ||
      lastInitialMessageId !== lastChatMessageId;

    if (shouldUpdateMessages) {
      chat.setMessages(messagesToSet);
    }
  }, [
    conversationStatus,
    conversationLoading,
    initialMessages,
    chat.messages,
    chat.setMessages,
  ]);

  return chat;
}
