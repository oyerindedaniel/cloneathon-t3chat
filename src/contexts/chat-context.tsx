import React, {
  useCallback,
  useState,
  useRef,
  useEffect,
  useMemo,
  RefObject,
  startTransition,
} from "react";
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
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useLatestValue } from "@/hooks/use-latest-value";
import { useGuestStorage } from "@/contexts/guest-storage-context";
import { CONVERSATION_QUERY_LIMIT } from "@/constants/conversations";
import type { BranchStatus } from "@/server/db/schema";
import { toAIMessages } from "@/lib/utils/message";
import { useToast } from "@/hooks/use-toast";
import type {
  ChatHelpers,
  LocationToolStatus,
  LocationToolCall,
} from "./types";
import { DEFAULT_CHAT_HELPERS } from "./constants";

interface ChatContextType extends ChatHelpers {
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
  currentConversationId: string | null;
  startNewConversationInstant: (message: string, modelId?: string) => string;
  switchToConversation: (conversationId: string, modelId?: string) => void;
  isConversationLoading: boolean;
  isConversationError: boolean;
  conversationError: unknown;
  skipInitialChatLoadRef: React.RefObject<boolean>;
  setCurrentConversationId: (conversationId: string) => void;
  handleNewMessage: (message: string) => void;
  handleChatPageOnLoad: (conversationId: string) => void;
  handleNewConversation: () => void;
  isNewConversation: boolean;
  setIsNewConversation: (value: boolean) => void;
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

const initialConversationId = uuidv4();

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();

  const [currentConversationId, setCurrentConversationId] = useState<string>(
    initialConversationId
  );
  const currentConversationIdRef = useLatestValue(currentConversationId);

  const previousTitleRef = useRef<string | null>(null);
  const [selectedModel, setSelectedModelState] = useState(DEFAULT_MODEL.id);
  const [isNewConversation, setIsNewConversation] = useState(false);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);

  const skipInitialChatLoadRef = useRef(false);

  const guestStorage = useGuestStorage();
  const isGuest = !isAuthenticated;

  const utils = api.useUtils();
  const updateTitle = api.conversations.updateTitle.useMutation();

  const chatInstances = useRef<Map<string, ChatHelpers>>(new Map());

  const {
    isLoading: conversationLoading,
    isError: isConversationError,
    error: conversationError,
  } = useConversation({ id: currentConversationId, isNewConversation });

  const [activeConversationIds, setActiveConversationIds] = useState<
    Set<string>
  >(new Set([initialConversationId]));

  const [currentChatData, setCurrentChatData] =
    useState<ChatHelpers>(DEFAULT_CHAT_HELPERS);

  const generateTitle = useCallback(
    async (
      {
        convId,
        isTitleCreated,
      }: {
        convId: string;
        isTitleCreated: RefObject<boolean>;
      },
      retries = 3
    ): Promise<string | null> => {
      for (let i = 0; i < retries; i++) {
        try {
          const chatInstance = chatInstances.current.get(convId);
          const messagesForTitle = chatInstance?.messages || [];

          if (messagesForTitle.length === 0) {
            console.warn(`Messages sent to generate-title for ${convId}: 0 []`);
            return null;
          }

          const response = await fetch("/api/generate-title", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ messages: messagesForTitle }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(
              "Title generation failed with HTTP error:",
              response.status,
              errorText
            );
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const title = await response.text();

          isTitleCreated.current = true;
          return title;
        } catch (error) {
          if (i === retries - 1) throw error;
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * Math.pow(2, i))
          );
        }
      }
      return null;
    },
    []
  );

  const updateConversationTitle = useCallback(
    async ({
      convId,
      isTitleCreated,
    }: {
      convId: string;
      isTitleCreated: RefObject<boolean>;
    }) => {
      if (!convId) return;

      try {
        const newTitle = await generateTitle({
          convId,
          isTitleCreated,
        });

        if (isGuest) {
          if (newTitle) {
            guestStorage.updateConversation(convId, {
              title: newTitle,
            });
          }
        } else {
          const conversationData = utils.conversations.getById.getData({
            id: convId,
          });
          previousTitleRef.current = conversationData?.title || null;

          if (!newTitle) return;

          utils.conversations.getById.setData({ id: convId }, (old) =>
            old ? { ...old, title: newTitle } : undefined
          );

          await updateTitle.mutateAsync({
            id: convId,
            title: newTitle,
          });
        }
      } catch (error) {
        showToast("Failed to update title", "error");

        if (!isGuest && previousTitleRef.current) {
          utils.conversations.getById.setData({ id: convId }, (old) =>
            old ? { ...old, title: previousTitleRef.current! } : undefined
          );
        }
      }
    },
    [generateTitle, isGuest, guestStorage, updateTitle, utils, showToast]
  );

  const handleChatFinish = useCallback(
    async ({
      convId,
      message,
      isTitleCreated,
    }: {
      convId: string;
      message: Message;
      isTitleCreated: RefObject<boolean>;
    }) => {
      if (convId) {
        if (isGuest) {
          guestStorage.addMessage(convId, {
            id: message.id,
            role: "assistant",
            content: message.content,
            ...(message.parts && { parts: message.parts }),
            ...(message.annotations && { annotations: message.annotations }),
            ...(message.experimental_attachments && {
              experimental_attachments: message.experimental_attachments,
            }),
            createdAt: new Date(),
          } as AIMessage);
        }

        if (!isTitleCreated.current) {
          await updateConversationTitle({ convId, isTitleCreated });
        }
      }
    },
    [isGuest, guestStorage, updateConversationTitle]
  );

  const cleanupInactiveConversations = useCallback(() => {
    const instancesToRemove: string[] = [];

    chatInstances.current.forEach((chatInstance, convId) => {
      const isInactive = !activeConversationIds.has(convId);
      const isNotStreaming = chatInstance.status !== "streaming";
      const isNotCurrent = convId !== currentConversationId;

      if (isInactive && isNotStreaming && isNotCurrent) {
        instancesToRemove.push(convId);
      }
    });

    instancesToRemove.forEach((convId) => {
      chatInstances.current.delete(convId);
    });

    setActiveConversationIds((prevIds) => {
      const updated = new Set(prevIds);
      instancesToRemove.forEach((id) => {
        if (id !== currentConversationId) {
          updated.delete(id);
        }
      });
      return updated;
    });
  }, [activeConversationIds, currentConversationId]);

  useEffect(() => {
    const interval = setInterval(cleanupInactiveConversations, 60000);
    return () => clearInterval(interval);
  }, [cleanupInactiveConversations]);

  const setSelectedModel = useCallback((modelId: string) => {
    setSelectedModelState(modelId);
  }, []);

  const startNewConversationInstant = useCallback(
    (message: string, modelId?: string): string => {
      const effectiveModelId = modelId || selectedModel;

      const conversationId = currentConversationIdRef.current;

      const initialTitle =
        message.length > 50 ? `${message.slice(0, 47)}...` : message;

      skipInitialChatLoadRef.current = true;

      try {
        flushSync(() => {
          setIsNewConversation(true);
          navigate(`/conversations/${conversationId}`, { replace: true });
        });

        setSelectedModelState(effectiveModelId);

        if (isGuest) {
          guestStorage.addConversation({
            id: conversationId,
            title: initialTitle,
            model: effectiveModelId,
            messages: [],
          });

          guestStorage.addMessage(conversationId, {
            id: messageIdGenerator(),
            role: "user",
            content: message,
            createdAt: new Date(),
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
              if (!old)
                return {
                  pages: [
                    { conversations: [newConversation], nextCursor: undefined },
                  ],
                  pageParams: [null],
                };
              const [firstPage, ...rest] = old.pages;
              return {
                ...old,
                pages: [
                  {
                    ...firstPage,
                    conversations: [
                      newConversation,
                      ...firstPage.conversations,
                    ],
                  },
                  ...rest,
                ],
              };
            }
          );
        }

        const chatInstance = chatInstances.current.get(currentConversationId);

        if (chatInstance) {
          chatInstance.setMessages([]);
          chatInstance.append({ role: "user", content: message });
        }
        return conversationId;
      } catch {
        return "";
      }
    },
    [selectedModel, navigate, isGuest, guestStorage, userId]
  );

  const handleChatUpdate = useCallback(
    (conversationId: string, chatHelpers: ChatHelpers) => {
      chatInstances.current.set(conversationId, chatHelpers);

      if (conversationId === currentConversationIdRef.current) {
        startTransition(() => setCurrentChatData(chatHelpers));
      }
    },
    []
  );

  const switchToConversation = useCallback(
    (conversationId: string, modelId?: string) => {
      if (modelId) {
        setSelectedModelState(modelId);
      }

      skipInitialChatLoadRef.current = true;

      cleanupInactiveConversations();

      flushSync(() => {
        setCurrentConversationId(conversationId);
        setActiveConversationIds((prev) => new Set([...prev, conversationId]));
      });

      setIsNewConversation(false);
      navigate(`/conversations/${conversationId}`);
    },
    []
  );

  const setCurrentConversationIdCallback = useCallback(
    (conversationId: string) => {
      setCurrentConversationId(conversationId);
    },
    []
  );

  const handleNewMessage = useCallback(
    (message: string) => {
      const currentConvId = currentConversationIdRef.current;
      if (!currentConvId || (isGuest && !guestStorage.canAddMessage())) {
        return;
      }

      const chatInstance = chatInstances.current.get(currentConvId);

      if (chatInstance) {
        if (isGuest) {
          guestStorage.addMessage(currentConvId, {
            id: messageIdGenerator(),
            role: "user",
            content: message,
            createdAt: new Date(),
          });
        }
        chatInstance.append({
          role: "user",
          content: message,
        });
      }
    },
    [isGuest, guestStorage]
  );

  const handleChatPageOnLoad = useCallback((conversationId: string) => {
    setCurrentConversationId(conversationId);
    setActiveConversationIds((prev) => new Set([...prev, conversationId]));
  }, []);

  const handleNewConversation = useCallback(() => {
    navigate("/conversations");
    const newConversationId = uuidv4();
    setCurrentConversationId(newConversationId);
    setSelectedModel(DEFAULT_MODEL.id);
    setActiveConversationIds((prev) => new Set([...prev, newConversationId]));
  }, [navigate]);

  // console.log({
  //   currentChatData,
  //   currentConversationId,
  //   activeConversationIds,
  // });

  const value: ChatContextType = {
    ...currentChatData,
    selectedModel,
    setSelectedModel,
    currentConversationId,
    startNewConversationInstant,
    switchToConversation,
    isConversationLoading: conversationLoading,
    isNewConversation,
    setIsNewConversation,
    handleChatPageOnLoad,
    skipInitialChatLoadRef,
    handleNewMessage,
    handleNewConversation,
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

  return (
    <ChatContext.Provider value={value}>
      {Array.from(activeConversationIds).map((convId) => (
        <ChatStreamer
          key={convId}
          conversationId={convId}
          currentConversationId={currentConversationId}
          isWebSearchEnabled={isWebSearchEnabled}
          selectedModel={selectedModel}
          isGuest={isGuest}
          isNewConversation={isNewConversation}
          onChatUpdate={handleChatUpdate}
          onFinish={({ message, isTitleCreated }) =>
            handleChatFinish({ convId, message, isTitleCreated })
          }
          onToolCall={() => {}}
        />
      ))}
      {children}
    </ChatContext.Provider>
  );
}

interface ChatStreamerProps {
  conversationId: string;
  currentConversationId: string;
  isWebSearchEnabled: boolean;
  selectedModel: string;
  isGuest: boolean;
  isNewConversation: boolean;
  onChatUpdate: (conversationId: string, chatHelpers: ChatHelpers) => void;
  onFinish: ({
    message,
  }: {
    message: Message;
    isTitleCreated: RefObject<boolean>;
  }) => void;
  onToolCall: (toolCall: LocationToolCall) => void;
}

function ChatStreamer({
  conversationId,
  currentConversationId,
  isWebSearchEnabled,
  selectedModel,
  isGuest,
  isNewConversation,
  onChatUpdate,
  onFinish,
  onToolCall,
}: ChatStreamerProps) {
  const isWebSearchEnabledRef = useLatestValue(isWebSearchEnabled);
  const selectedModelRef = useLatestValue(selectedModel);
  const guestStorage = useGuestStorage();
  const hasInitializedMessagesRef = useRef(false);
  const isTitleCreated = useRef(false);
  const initialMessagesRef = useRef<AIMessage[] | null>(null);

  const { conversation } = useConversation({
    id: conversationId,
    isNewConversation: false,
  });

  const initialMessages = useMemo<AIMessage[]>(() => {
    if (hasInitializedMessagesRef.current && initialMessagesRef.current) {
      return initialMessagesRef.current;
    }

    if (!isGuest && !conversation) {
      return [];
    }

    let messages: AIMessage[] = [];

    if (isGuest) {
      const guestConversation = guestStorage.getConversation(conversationId);
      messages = guestConversation?.messages || [];
    } else if (conversation?.messages) {
      messages = toAIMessages(conversation.messages);
    }

    hasInitializedMessagesRef.current = true;
    initialMessagesRef.current = messages;
    isTitleCreated.current = !!messages.length;

    return messages;
  }, [conversationId, isGuest, guestStorage, conversation, isNewConversation]);

  const chat = useAIChat({
    api: "/api/chat",
    id: conversationId,
    initialMessages: initialMessages,
    sendExtraMessageFields: true,
    generateId: messageIdGenerator,
    maxSteps: 5,
    experimental_prepareRequestBody: ({ messages }) => {
      return {
        message: messages.at(-1),
        id: conversationId,
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
        console.error(
          `Chat API error in background chat (${conversationId}):`,
          response.status,
          errorText
        );
      }
    },
    onFinish: (message) => {
      onFinish({ message, isTitleCreated });
    },
    onToolCall: ({ toolCall }) => {
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
      console.error(`chat error for conversation ${conversationId}:`, error);
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
    onChatUpdate(conversationId, chat);
    return () => {};
  }, [
    conversationId,
    chat.messages,
    chat.input,
    chat.status,
    chat.error,
    chat.data,
    onChatUpdate,
    currentConversationId,
  ]);

  return null;
}

export function useChatMessages() {
  return useContextSelector(ChatContext, (state: ChatContextType) => ({
    messages: state.messages,
    setMessages: state.setMessages,
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
  return useContextSelector(ChatContext, (state) => ({
    input: state.input,
    handleInputChange: state.handleInputChange,
    handleSubmit: state.handleSubmit,
  }));
}

export function useChatControls() {
  return useContextSelector(ChatContext, (state) => ({
    currentConversationId: state.currentConversationId,
    startNewConversationInstant: state.startNewConversationInstant,
    switchToConversation: state.switchToConversation,
    handleNewMessage: state.handleNewMessage,
    handleNewConversation: state.handleNewConversation,
    setCurrentConversationId: state.setCurrentConversationId,
    handleChatPageOnLoad: state.handleChatPageOnLoad,
    skipInitialChatLoadRef: state.skipInitialChatLoadRef,
    isNewConversation: state.isNewConversation,
    setIsNewConversation: state.setIsNewConversation,
  }));
}

export function useChatConfig() {
  return useContextSelector(ChatContext, (state) => ({
    selectedModel: state.selectedModel,
    setSelectedModel: state.setSelectedModel,
    isWebSearchEnabled: state.isWebSearchEnabled,
    toggleWebSearch: state.toggleWebSearch,
  }));
}

export function useChatSessionStatus() {
  return useContextSelector(ChatContext, (state) => ({
    isConversationLoading: state.isConversationLoading,
    isGuest: state.isGuest,
    canSendMessage: state.canSendMessage,
    remainingMessages: state.remainingMessages,
    totalMessages: state.totalMessages,
    conversationError: state.conversationError,
    isConversationError: state.isConversationError,
    maxMessages: state.maxMessages,
  }));
}
