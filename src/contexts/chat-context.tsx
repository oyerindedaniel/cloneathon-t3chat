import React, { useCallback, useState, useRef } from "react";
import { createContext, useContextSelector } from "use-context-selector";
import { useChat as useAIChat, useCompletion } from "@ai-sdk/react";
import { createIdGenerator } from "ai";
import { useAuth } from "@/hooks/use-auth";
import { useConversation } from "@/hooks/use-conversations";
import { api } from "@/trpc/react";
import { DEFAULT_MODEL } from "@/lib/ai/models";
import { useNavigate } from "react-router-dom";
import { Message as AIMessage } from "ai";
import { v4 as uuidv4 } from "uuid";
import { flushSync } from "react-dom";
import { UseChatHelpers } from "@ai-sdk/react";
import { useGuestStorage } from "@/hooks/use-local-storage";
import { useAutoResume } from "@/hooks/use-auto-resume";
import type { BranchStatus } from "@/server/db/schema";
import { useLatestValue } from "@/hooks/use-latest-value";
import { CONVERSATION_QUERY_LIMIT } from "@/app/constants/conversations";

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

  const titleId = `title-${currentConversationId ?? uuidv4()}`;

  const {
    conversation,
    isLoading: conversationLoading,
    isError: isConversationError,
    error: conversationError,
  } = useConversation({ id: currentConversationId, isNavigatingToNewChat });

  const titleCompletion = useCompletion({
    id: titleId,
    api: "/api/generate-title",
    onFinish: (result) => {
      isFirstConversationTitleCreated.current = true;
    },
    onError: (error) => {
      console.error("Title generation failed:", error);
    },
  });

  const initialMessages: AIMessage[] = React.useMemo(() => {
    if (isGuest && currentConversationId) {
      const guestConversation = guestStorage.getConversation(
        currentConversationId
      );
      return (
        guestConversation?.messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          createdAt: new Date(msg.timestamp),
        })) || []
      );
    }

    if (conversation?.messages) {
      return conversation.messages.map((msg) => ({
        id: msg.aiMessageId,
        role: msg.role as AIMessage["role"],
        content: msg.content,
        createdAt: new Date(msg.createdAt),
      }));
    }

    return [];
  }, [conversation, currentConversationId, isGuest, guestStorage]);

  const generateTitle = useCallback(
    async (messages: AIMessage[]): Promise<string | null> => {
      try {
        const result = await titleCompletion.complete("", {
          body: { messages },
        });

        console.log({ result });

        return result || null;
      } catch (error) {
        console.error("Title generation failed:", error);
        return null;
      }
    },
    [titleCompletion]
  );

  const updateConversationTitle = useCallback(
    async (conversationId: string, messages: AIMessage[]) => {
      if (!conversationId || messages.length === 0) return;

      console.log("in update conversiotn tit");
      const newTitle = await generateTitle(messages);

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

  const chat = useAIChat({
    api: "/api/chat",
    initialMessages,
    sendExtraMessageFields: true,
    generateId: messageIdGenerator,
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
          });
        }

        if (!isFirstConversationTitleCreated.current) {
          await updateConversationTitle(currentConversationIdRef.current, [
            ...chat.messages,
            message,
          ]);
        }
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
            id: uuidv4(),
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
      setCurrentConversationId(conversationId);
      if (modelId) {
        setSelectedModelState(modelId);
      }
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

  const handleSubmit = useCallback(
    (event?: { preventDefault?: () => void }) => {
      if (isGuest && !guestStorage.canAddMessage()) {
        event?.preventDefault?.();
        return;
      }

      if (isGuest && currentConversationId && chat.input.trim()) {
        guestStorage.addMessage(currentConversationId, {
          id: uuidv4(),
          role: "user",
          content: chat.input.trim(),
        });
      }

      chat.handleSubmit(event);
    },
    [chat, isGuest, guestStorage, currentConversationId]
  );

  const value: ChatContextType = {
    ...chat,
    handleSubmit,
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
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatMessages() {
  return {
    messages: useContextSelector(ChatContext, (state) => state.messages),
    append: useContextSelector(ChatContext, (state) => state.append),
    setMessages: useContextSelector(ChatContext, (state) => state.setMessages),
    reload: useContextSelector(ChatContext, (state) => state.reload),
    stop: useContextSelector(ChatContext, (state) => state.stop),
    status: useContextSelector(ChatContext, (state) => state.status),
    error: useContextSelector(ChatContext, (state) => state.error),
    experimental_resume: useContextSelector(
      ChatContext,
      (state) => state.experimental_resume
    ),
  };
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
