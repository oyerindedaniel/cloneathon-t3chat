import React, { useCallback, useState, useRef, useEffect } from "react";
import { createContext, useContextSelector } from "use-context-selector";
import { useChat as useAIChat } from "@ai-sdk/react";
import { createIdGenerator, Message } from "ai";
import { useAuth } from "@/hooks/use-auth";
import { useConversation } from "@/hooks/use-conversations";
import { api } from "@/trpc/react";
import { DEFAULT_MODEL } from "@/lib/ai/models";
import { useNavigate } from "react-router-dom";
import { Message as AIMessage } from "ai";
import { v4 as uuidv4 } from "uuid";
import { flushSync } from "react-dom";
import { UseChatHelpers } from "@ai-sdk/react";
import { ToolCall, ToolResult } from "ai";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useLatestValue } from "@/hooks/use-latest-value";
import { useGuestStorage } from "@/contexts/guest-storage-context";
import { CONVERSATION_QUERY_LIMIT } from "@/constants/conversations";
import { tryParseJson } from "@/lib/utils/app";
import type { BranchStatus } from "@/server/db/schema";

type LocationToolCall = ToolCall<"getLocation", { message: string }>;

export type GetLocationResult =
  | { latitude: number; longitude: number; timezone: string }
  | { error: "permission_denied" | "not_supported" };

export type AllToolResults = ToolResult<
  "getLocation",
  {
    message: string;
  },
  GetLocationResult
>;

export type LocationToolStatus = "awaiting_user_input";

interface ChatContextType extends UseChatHelpers {
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
  currentConversationId: string | null;
  startNewConversationInstant: (
    message: string,
    modelId?: string
  ) => Promise<string>;
  switchToConversation: (conversationId: string, modelId?: string) => void;
  isCreatingConversation: boolean;
  isConversationLoading: boolean;
  isConversationError: boolean;
  conversationError: unknown;
  setCurrentConversationId: (conversationId: string) => void;
  isNavigatingToNewChat: boolean;
  isGuest: boolean;
  canSendMessage: boolean;
  remainingMessages: number;
  totalMessages: number;
  maxMessages: number;
  isWebSearchEnabled: boolean;
  toggleWebSearch: () => void;
  addToolResult: ({ toolCallId, result }: AllToolResults) => void;
}

const ChatContext = createContext<ChatContextType>(null!);

const messageIdGenerator = createIdGenerator({
  prefix: "msgc",
  size: 16,
});

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const currentConversationIdRef = useLatestValue(currentConversationId);

  const previousTitleRef = useRef<string | null>(null);
  const [selectedModel, setSelectedModelState] = useState(DEFAULT_MODEL.id);
  const selectedModelRef = useLatestValue(selectedModel);
  const [isNavigatingToNewChat, setIsNavigatingToNewChat] = useState(false);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  const isWebSearchEnabledRef = useLatestValue(isWebSearchEnabled);

  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const isFirstConversationTitleCreated = useRef(false);

  const guestStorage = useGuestStorage();
  const isGuest = !isAuthenticated;

  const utils = api.useUtils();
  const updateTitle = api.conversations.updateTitle.useMutation();

  const {
    conversation,
    status: conversationStatus,
    isLoading: conversationLoading,
    isError: isConversationError,
    error: conversationError,
  } = useConversation({ id: currentConversationId, isNavigatingToNewChat });

  const initialMessages = React.useMemo<AIMessage[]>(() => {
    if (isGuest && currentConversationId) {
      const guestConversation = guestStorage.getConversation(
        currentConversationId
      );

      return guestConversation?.messages || [];
    }

    if (conversation?.messages) {
      return conversation.messages.map((msg) => ({
        id: msg.aiMessageId,
        role: msg.role as AIMessage["role"],
        content: msg.content,
        createdAt: new Date(msg.createdAt),
        parts: tryParseJson<Message["parts"]>(msg.parts),
        annotations: tryParseJson<Message["annotations"]>(msg.annotations),
        experimental_attachments: tryParseJson<
          Message["experimental_attachments"]
        >(msg.attachments),
      }));
    }

    return [];
  }, [conversation, currentConversationId, isGuest, guestStorage]);

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
    onFinish: async (message) => {
      if (currentConversationIdRef.current) {
        if (isGuest) {
          guestStorage.addMessage(currentConversationIdRef.current, {
            id: message.id,
            role: "assistant",
            content: message.content,
            ...(message.parts && { parts: message.parts }),
            ...(message.annotations && { annotations: message.annotations }),
            ...(message.experimental_attachments && {
              experimental_attachments: message.experimental_attachments,
            }),
            createdAt: new Date(),
          });
        }

        if (!isFirstConversationTitleCreated.current) {
          await updateConversationTitle(currentConversationIdRef.current);
        }
      }
    },
    onToolCall: async ({ toolCall }) => {
      if (toolCall.toolName === "getLocation") {
        chat.setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: messageIdGenerator(),
            role: "assistant",
            content: "",
            parts: {
              type: "tool-invocation",
              toolInvocation: {
                toolCallId: toolCall.toolCallId,
                toolName: toolCall.toolName,
                state: "awaiting_user_input" as LocationToolStatus,
                args: (toolCall as LocationToolCall).args.message,
              },
            },
          } as unknown as AIMessage,
        ]);
      }
    },
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  useAutoResume({
    autoResume: isAuthenticated && !!currentConversationId,
    initialMessages: chat.messages,
    experimental_resume: chat.experimental_resume,
    data: chat.data,
    setMessages: chat.setMessages,
  });

  const chatMessagesRef = useLatestValue(chat.messages);

  useEffect(() => {
    isFirstConversationTitleCreated.current = !!initialMessages;
  }, [initialMessages]);

  useEffect(() => {
    const lastInitialMessage = initialMessages[initialMessages.length - 1];
    const lastChatMessage = chat.messages[chat.messages.length - 1];

    const lastMessageChanged =
      lastInitialMessage?.id !== lastChatMessage?.id ||
      lastInitialMessage?.content !== lastChatMessage?.content;

    if (isGuest && lastMessageChanged) {
      chat.setMessages(initialMessages);
    } else if (conversationStatus === "success" && lastMessageChanged) {
      chat.setMessages(initialMessages);
    }
  }, [conversationStatus, isGuest, currentConversationId]);

  useEffect(() => {
    if (isGuest && initialMessages.length === 0 && currentConversationId) {
      navigate("/conversations");
    }
  }, [currentConversationId]);

  const generateTitle = useCallback(async (): Promise<string | null> => {
    try {
      const conversationTextMessages = chatMessagesRef.current;
      const response = await fetch("/api/generate-title", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: conversationTextMessages }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const title = await response.text();
      isFirstConversationTitleCreated.current = true;
      return title;
    } catch (error) {
      console.error("Title generation failed:", error);
      return null;
    }
  }, [chat.messages]);

  const updateConversationTitle = useCallback(
    async (conversationId: string) => {
      if (!conversationId) return;

      const newTitle = await generateTitle();

      try {
        if (isGuest) {
          if (newTitle) {
            guestStorage.updateConversation(conversationId, {
              title: newTitle,
            });
          }
        } else {
          const currentConversation = utils.conversations.getById.getData({
            id: conversationId,
          });
          previousTitleRef.current = currentConversation?.title || null;

          if (!newTitle) return;

          utils.conversations.getById.setData({ id: conversationId }, (old) =>
            old ? { ...old, title: newTitle } : undefined
          );

          await updateTitle.mutateAsync({
            id: conversationId,
            title: newTitle,
          });
        }
      } catch (error) {
        console.error("Failed to update title:", error);

        if (!isGuest && previousTitleRef.current) {
          utils.conversations.getById.setData({ id: conversationId }, (old) =>
            old ? { ...old, title: previousTitleRef.current! } : undefined
          );
        }
      }
    },
    [generateTitle, isGuest, guestStorage, updateTitle, utils]
  );

  const setSelectedModel = useCallback((modelId: string) => {
    setSelectedModelState(modelId);
  }, []);

  const startNewConversationInstant = useCallback(
    async (message: string, modelId?: string): Promise<string> => {
      const effectiveModelId = modelId || selectedModel;
      const conversationId = uuidv4();

      const initialTitle =
        message.length > 50 ? `${message.slice(0, 47)}...` : message;

      setIsCreatingConversation(true);

      try {
        flushSync(() => {
          setIsNavigatingToNewChat(true);
          navigate(`/conversations/${conversationId}`, { replace: true });
        });

        setCurrentConversationId(conversationId);
        setSelectedModelState(effectiveModelId);

        if (isGuest) {
          guestStorage.addConversation({
            id: conversationId,
            title: initialTitle,
            model: effectiveModelId,
            messages: [],
          });

          guestStorage.addMessage(conversationId, {
            id: conversationId,
            role: "user",
            content: message,
          });
        } else if (userId) {
          const newConversation = {
            id: conversationId,
            userId,
            title: initialTitle,
            model: effectiveModelId,
            parentConversationId: null,
            branchPointMessageId: null,
            branchLevel: 0,
            branchStatus: "active" as BranchStatus,
            isShared: false,
            shareId: null,
            totalMessages: 0,
            lastMessageAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastMessage: null,
          };

          utils.conversations.getAll.setInfiniteData(
            { limit: CONVERSATION_QUERY_LIMIT },
            (old) => {
              if (!old) {
                const newConversationPage = {
                  conversations: [newConversation],
                  nextCursor: undefined,
                };
                return {
                  pages: [newConversationPage],
                  pageParams: [null],
                };
              }

              const newConversationPage = {
                conversations: [newConversation],
                nextCursor: undefined,
              };

              return {
                ...old,
                pages: [newConversationPage, ...old.pages],
              };
            }
          );
        }

        chat.setMessages([]);
        chat.append({
          role: "user",
          content: message,
        });

        return conversationId;
      } finally {
        setIsCreatingConversation(false);
      }
    },
    [selectedModel, navigate, chat, isGuest, guestStorage, userId, utils]
  );

  const switchToConversation = useCallback(
    (conversationId: string, modelId?: string) => {
      if (modelId) {
        setSelectedModelState(modelId);
      }
      setCurrentConversationId(conversationId);
      setIsNavigatingToNewChat(false);
    },
    []
  );

  const setCurrentConversationIdCallback = useCallback(
    (conversationId: string) => {
      setCurrentConversationId(conversationId);
    },
    []
  );

  const value: ChatContextType = {
    ...chat,
    selectedModel,
    setSelectedModel,
    currentConversationId,
    startNewConversationInstant,
    switchToConversation,
    isCreatingConversation,
    isConversationLoading: conversationLoading,
    isNavigatingToNewChat,
    setCurrentConversationId: setCurrentConversationIdCallback,
    isGuest,
    canSendMessage: isGuest ? guestStorage.canAddMessage() : true,
    remainingMessages: isGuest ? guestStorage.getRemainingMessages() : Infinity,
    totalMessages: isGuest ? guestStorage.totalMessages : 0,
    maxMessages: isGuest ? guestStorage.maxMessages : Infinity,
    isWebSearchEnabled,
    toggleWebSearch: () => setIsWebSearchEnabled((prev) => !prev),
    isConversationError,
    conversationError,
    addToolResult: chat.addToolResult,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatMessages() {
  return useContextSelector(ChatContext, (state: ChatContextType) => ({
    messages: state.messages,
    append: state.append,
    stop: state.stop,
    reload: state.reload,
    status: state.status,
    error: state.error,
    experimental_resume: state.experimental_resume,
    addToolResult: state.addToolResult,
  }));
}

export function useChatInput() {
  return {
    input: useContextSelector(ChatContext, (state) => state.input),
    handleInputChange: useContextSelector(
      ChatContext,
      (state) => state.handleInputChange
    ),
    handleSubmit: useContextSelector(
      ChatContext,
      (state) => state.handleSubmit
    ),
  };
}

export function useChatControls() {
  return {
    currentConversationId: useContextSelector(
      ChatContext,
      (state) => state.currentConversationId
    ),
    startNewConversationInstant: useContextSelector(
      ChatContext,
      (state) => state.startNewConversationInstant
    ),
    switchToConversation: useContextSelector(
      ChatContext,
      (state) => state.switchToConversation
    ),
    setCurrentConversationId: useContextSelector(
      ChatContext,
      (state) => state.setCurrentConversationId
    ),
    isNavigatingToNewChat: useContextSelector(
      ChatContext,
      (state) => state.isNavigatingToNewChat
    ),
    isCreatingConversation: useContextSelector(
      ChatContext,
      (state) => state.isCreatingConversation
    ),
  };
}

export function useChatConfig() {
  return {
    selectedModel: useContextSelector(
      ChatContext,
      (state) => state.selectedModel
    ),
    setSelectedModel: useContextSelector(
      ChatContext,
      (state) => state.setSelectedModel
    ),
    isWebSearchEnabled: useContextSelector(
      ChatContext,
      (state) => state.isWebSearchEnabled
    ),
    toggleWebSearch: useContextSelector(
      ChatContext,
      (state) => state.toggleWebSearch
    ),
  };
}

export function useChatSessionStatus() {
  return {
    isConversationLoading: useContextSelector(
      ChatContext,
      (state) => state.isConversationLoading
    ),
    isGuest: useContextSelector(ChatContext, (state) => state.isGuest),
    canSendMessage: useContextSelector(
      ChatContext,
      (state) => state.canSendMessage
    ),
    remainingMessages: useContextSelector(
      ChatContext,
      (state) => state.remainingMessages
    ),
    totalMessages: useContextSelector(
      ChatContext,
      (state) => state.totalMessages
    ),
    conversationError: useContextSelector(
      ChatContext,
      (state) => state.conversationError
    ),
    isConversationError: useContextSelector(
      ChatContext,
      (state) => state.isConversationError
    ),
    maxMessages: useContextSelector(ChatContext, (state) => state.maxMessages),
  };
}
