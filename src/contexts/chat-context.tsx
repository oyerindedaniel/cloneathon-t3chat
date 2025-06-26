import React, {
  useCallback,
  useState,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { createContext, useContextSelector } from "use-context-selector";
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
import { useLatestValue } from "@/hooks/use-latest-value";
import { useGuestStorage } from "@/contexts/guest-storage-context";
import { CONVERSATION_QUERY_LIMIT } from "@/constants/conversations";
import type { BranchStatus } from "@/server/db/schema";
import { toAIMessage, toAIMessages } from "@/lib/utils/message";
import { useToast } from "@/hooks/use-toast";
import { useChatInstance } from "./use-chat-instance";

export type LocationToolCall = ToolCall<"getLocation", { message: string }>;

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
  isNewConversation: boolean;
  setIsNewConversation: (value: boolean) => void;
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
  const { showToast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const currentConversationIdRef = useLatestValue(currentConversationId);

  const previousTitleRef = useRef<string | null>(null);
  const [selectedModel, setSelectedModelState] = useState(DEFAULT_MODEL.id);
  const [isNewConversation, setIsNewConversation] = useState(false);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);

  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [activeConversationIds, setActiveConversationIds] = useState<string[]>(
    []
  );

  const conversationTitleStatusRef = useRef<Map<string, boolean>>(new Map());
  const completedConversationsRef = useRef<Set<string>>(new Set());

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
  } = useConversation({ id: currentConversationId, isNewConversation });

  const chatInstancesRef = useRef<Map<string, UseChatHelpers>>(new Map());

  const conversationHasTitle = useMemo(() => {
    if (isNewConversation) return false;

    return isGuest
      ? !!guestStorage.getConversation(currentConversationId || "")?.title
      : !!conversation?.title;
  }, [
    isNewConversation,
    isGuest,
    currentConversationId,
    guestStorage,
    conversation?.title,
  ]);

  useEffect(() => {
    if (currentConversationId) {
      conversationTitleStatusRef.current.set(
        currentConversationId,
        conversationHasTitle
      );
    }
  }, [currentConversationId, conversationHasTitle]);

  const currentChat = currentConversationId
    ? chatInstancesRef.current.get(currentConversationId)
    : undefined;

  const generateTitle = useCallback(
    async (
      conversationId: string,
      lastMessageId?: string
    ): Promise<string | null> => {
      try {
        const chatInstance = chatInstancesRef.current.get(conversationId);
        const messagesForTitle = chatInstance?.messages || [];

        if (messagesForTitle.length === 0) {
          console.warn(
            `Messages sent to generate-title for ${conversationId}: 0 []`
          );
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
        conversationTitleStatusRef.current.set(conversationId, true);
        return title;
      } catch (error) {
        console.error(`Title generation failed for ${conversationId}:`, error);
        return null;
      }
    },
    []
  );

  const updateConversationTitle = useCallback(
    async (conversationId: string, lastMessageId?: string) => {
      if (!conversationId) return;

      const newTitle = await generateTitle(conversationId, lastMessageId);

      try {
        if (isGuest) {
          if (newTitle) {
            guestStorage.updateConversation(conversationId, {
              title: newTitle,
            });
          }
        } else {
          const conversationData = utils.conversations.getById.getData({
            id: conversationId,
          });
          previousTitleRef.current = conversationData?.title || null;

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
        showToast("Failed to update title:", "error");

        if (!isGuest && previousTitleRef.current) {
          utils.conversations.getById.setData({ id: conversationId }, (old) =>
            old ? { ...old, title: previousTitleRef.current! } : undefined
          );
        }
      }
    },
    [generateTitle, isGuest, guestStorage, updateTitle, utils, showToast]
  );

  const handleChatReady = useCallback(
    (convId: string, chatHelpers: UseChatHelpers) => {
      chatInstancesRef.current.set(convId, chatHelpers);

      if (
        convId === currentConversationIdRef.current &&
        chatHelpers.messages.length === 0
      ) {
        if (isGuest) {
          const guestConversation = guestStorage.getConversation(convId);
          if (guestConversation?.messages) {
            chatHelpers.setMessages(guestConversation.messages);
          }
        } else {
          if (conversation?.messages) {
            chatHelpers.setMessages(toAIMessages(conversation.messages));
          }
        }
      }
    },
    [isGuest, guestStorage, conversation, currentConversationIdRef]
  );

  const handleMessageFinish = useCallback(
    async (convId: string, message: Message) => {
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
        });
      }

      const hasGeneratedTitle =
        conversationTitleStatusRef.current.get(convId) || false;
      if (!hasGeneratedTitle) {
        await updateConversationTitle(convId, message.id);
      }

      completedConversationsRef.current.add(convId);
    },
    [isGuest, guestStorage, updateConversationTitle]
  );

  const handleToolCall = useCallback(
    (convId: string, toolCall: LocationToolCall) => {
      const chatInstance = chatInstancesRef.current.get(convId);
      if (chatInstance) {
        chatInstance.setMessages((prevMessages) => [
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
                args: toolCall.args.message,
              },
            },
          } as unknown as AIMessage,
        ]);
      }
    },
    []
  );

  const handleMessageAppend = useCallback(
    (
      convId: string,
      message: Omit<AIMessage, "id"> | Omit<AIMessage, "id">[]
    ) => {
      const chatInstance = chatInstancesRef.current.get(convId);
      if (!chatInstance) return;

      const messagesToAppend = Array.isArray(message) ? message : [message];

      const messagesWithIds: AIMessage[] = messagesToAppend.map((msg) => ({
        ...msg,
        id: msg.id || messageIdGenerator(),
      }));

      chatInstance.setMessages((prevMessages) => [
        ...prevMessages,
        ...messagesWithIds,
      ]);

      if (isGuest) {
        messagesWithIds.forEach((msg) => {
          if (msg.role === "user") {
            guestStorage.addMessage(convId, {
              id: msg.id,
              role: msg.role,
              content: msg.content,
              ...(msg.parts && { parts: msg.parts }),
              ...(msg.annotations && { annotations: msg.annotations }),
              ...(msg.experimental_attachments && {
                experimental_attachments: msg.experimental_attachments,
              }),
              createdAt: new Date(),
            });
          }
        });
      }
    },
    [isGuest, guestStorage]
  );

  // Manage active conversation IDs without limits
  useEffect(() => {
    if (!currentConversationId) {
      setActiveConversationIds([]);
      chatInstancesRef.current.clear();
      conversationTitleStatusRef.current.clear();
      completedConversationsRef.current.clear();
      return;
    }

    setActiveConversationIds((prevIds) => {
      const newIdsSet = new Set([currentConversationId, ...prevIds]);
      return Array.from(newIdsSet);
    });
  }, [currentConversationId]);

  // Clean up completed conversations periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const completedIds = Array.from(completedConversationsRef.current);
      const currentId = currentConversationIdRef.current;

      // Remove completed conversations that aren't the current one
      completedIds.forEach((id) => {
        if (id !== currentId) {
          chatInstancesRef.current.delete(id);
          conversationTitleStatusRef.current.delete(id);
          completedConversationsRef.current.delete(id);
          setActiveConversationIds((prev) =>
            prev.filter((prevId) => prevId !== id)
          );
        }
      });
    }, 30000); // Clean up every 30 seconds

    return () => clearInterval(cleanupInterval);
  }, [currentConversationIdRef]);

  // Guest redirect effect
  useEffect(() => {
    if (!isGuest || !currentConversationId) return;

    const guestConversation = guestStorage.getConversation(
      currentConversationId
    );
    if (!guestConversation?.messages.length) {
      navigate("/conversations");
    }
  }, [currentConversationId, isGuest, guestStorage, navigate]);

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
          setIsNewConversation(true);
          navigate(`/conversations/${conversationId}`, { replace: true });
        });

        setCurrentConversationId(conversationId);
        setSelectedModelState(effectiveModelId);

        conversationTitleStatusRef.current.set(conversationId, false);

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

        // Add to active conversations immediately
        setActiveConversationIds((prev) => [conversationId, ...prev]);

        // Try to get chat instance and send message immediately
        // If not available, the useChatInstance hook will handle it when ready
        const chatInstance = chatInstancesRef.current.get(conversationId);
        if (chatInstance) {
          chatInstance.setMessages([]);
          chatInstance.append({ role: "user", content: message });
        }

        return conversationId;
      } finally {
        setIsCreatingConversation(false);
      }
    },
    [selectedModel, navigate, isGuest, guestStorage, userId, utils]
  );

  const switchToConversation = useCallback(
    (conversationId: string, modelId?: string) => {
      if (modelId) {
        setSelectedModelState(modelId);
      }
      setCurrentConversationId(conversationId);
      setIsNewConversation(false);
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
    ...(currentChat || {
      messages: [],
      append: () => {
        console.warn(
          "No active chat instance: append called without currentChat."
        );
        return Promise.resolve();
      },
      stop: () => {
        console.warn(
          "No active chat instance: stop called without currentChat."
        );
      },
      reload: () => {
        console.warn(
          "No active chat instance: reload called without currentChat."
        );
        return Promise.resolve();
      },
      status: "idle",
      error: undefined,
      experimental_resume: undefined,
      addToolResult: () => {
        console.warn(
          "No active chat instance: addToolResult called without currentChat."
        );
      },
      input: "",
      handleInputChange: () => {
        console.warn(
          "No active chat instance: handleInputChange called without currentChat."
        );
      },
      handleSubmit: () => {
        console.warn(
          "No active chat instance: handleSubmit called without currentChat."
        );
        return Promise.resolve();
      },
      data: undefined,
    }),
    selectedModel,
    setSelectedModel,
    currentConversationId,
    startNewConversationInstant,
    switchToConversation,
    isCreatingConversation,
    isConversationLoading: conversationLoading,
    isNewConversation,
    setIsNewConversation,
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
      {activeConversationIds.map((convId) => (
        <ChatInstanceRenderer
          key={convId}
          conversationId={convId}
          isWebSearchEnabled={isWebSearchEnabled}
          selectedModel={selectedModel}
          isGuest={isGuest}
          onChatReady={handleChatReady}
          onFinish={handleMessageFinish}
          onToolCall={handleToolCall}
          onAppend={handleMessageAppend}
        />
      ))}
      {children}
    </ChatContext.Provider>
  );
}

// Simple component wrapper for the hook
function ChatInstanceRenderer({
  conversationId,
  isWebSearchEnabled,
  selectedModel,
  isGuest,
  onChatReady,
  onFinish,
  onToolCall,
  onAppend,
}: {
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
}) {
  useChatInstance({
    conversationId,
    isWebSearchEnabled,
    selectedModel,
    isGuest,
    onChatReady,
    onFinish,
    onToolCall,
    onAppend,
  });

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
    isNewConversation: useContextSelector(
      ChatContext,
      (state) => state.isNewConversation
    ),
    setIsNewConversation: useContextSelector(
      ChatContext,
      (state) => state.setIsNewConversation
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
