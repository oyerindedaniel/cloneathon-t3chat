import React, {
  useCallback,
  useState,
  useRef,
  useEffect,
  useMemo,
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
import { UseChatHelpers } from "@ai-sdk/react";
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

interface ChatContextType extends ChatHelpers {
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
  currentConversationId: string | null;
  startNewConversationInstant: (message: string, modelId?: string) => string;
  switchToConversation: (conversationId: string, modelId?: string) => void;
  isConversationLoading: boolean;
  isConversationError: boolean;
  conversationError: unknown;
  setCurrentConversationId: (conversationId: string) => void;
  handleNewMessage: (message: string) => void;
  handleChatPageOnLoad: (conversationId: string) => void;
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
  const selectedModelRef = useLatestValue(selectedModel);
  const [isNewConversation, setIsNewConversation] = useState(false);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  const isWebSearchEnabledRef = useLatestValue(isWebSearchEnabled);
  const previousConversationIdRef = useRef<string | null>(null);
  const isFirstConversationTitleCreated = useRef(false);

  const guestStorage = useGuestStorage();
  const isGuest = !isAuthenticated;

  const utils = api.useUtils();
  const updateTitle = api.conversations.updateTitle.useMutation();

  const activeChatInstances = useRef<Map<string, UseChatHelpers>>(new Map());

  const generateTitle = useCallback(
    async (convId: string): Promise<string | null> => {
      try {
        const chatInstance = activeChatInstances.current.get(convId);
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
        if (convId === currentConversationIdRef.current) {
          isFirstConversationTitleCreated.current = true;
        }
        return title;
      } catch (error) {
        console.error(`Title generation failed for ${convId}:`, error);
        return null;
      }
    },
    [currentConversationIdRef]
  );

  const updateConversationTitle = useCallback(
    async (convId: string) => {
      if (!convId) return;

      const newTitle = await generateTitle(convId);

      try {
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
        showToast("Failed to update title:", "error");

        if (!isGuest && previousTitleRef.current) {
          utils.conversations.getById.setData({ id: convId }, (old) =>
            old ? { ...old, title: previousTitleRef.current! } : undefined
          );
        }
      }
    },
    [generateTitle, isGuest, guestStorage, updateTitle, utils, showToast]
  );

  const {
    conversation,
    isLoading: conversationLoading,
    isError: isConversationError,
    error: conversationError,
    status: conversationStatus,
  } = useConversation({ id: currentConversationId, isNewConversation });

  const [backgroundConversationIds, setBackgroundConversationIds] = useState<
    string[]
  >([]);

  const backgroundConversationIdsRef = useLatestValue(
    backgroundConversationIds
  );

  const initialMessagesForCoreChat = useMemo<AIMessage[]>(() => {
    if (currentConversationId) {
      if (isGuest) {
        const guestConversation = guestStorage.getConversation(
          currentConversationId
        );
        return guestConversation?.messages || [];
      } else if (conversation?.messages) {
        return toAIMessages(conversation.messages);
      }
    }
    return [];
  }, [currentConversationId, isGuest, guestStorage, conversation?.messages]);

  const handleChatFinish = useCallback(
    async (convId: string, message: Message) => {
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

        if (!isFirstConversationTitleCreated.current) {
          await updateConversationTitle(convId);
        }
      }
    },
    [isGuest, guestStorage, updateConversationTitle]
  );

  const coreChat = useAIChat({
    api: "/api/chat",
    id: currentConversationId || undefined,
    initialMessages: initialMessagesForCoreChat,
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
        console.error(
          "Chat API error in core chat context:",
          response.status,
          errorText
        );
        // throw new Error(`Chat API error: ${response.status}`);
      }
    },
    onFinish: async (message) => {
      const convId = currentConversationIdRef.current;
      if (convId) {
        await handleChatFinish(convId, message);
      }
    },
    onToolCall: async ({ toolCall }) => {
      const convId = currentConversationIdRef.current;
      if (convId) {
        coreChat.setMessages((prevMessages) => [
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
      console.error("Core chat error:", error);
    },
  });

  console.log({ currentConversationId });

  useAutoResume({
    autoResume: isAuthenticated && !!currentConversationId,
    initialMessages: coreChat.messages,
    experimental_resume: coreChat.experimental_resume,
    data: coreChat.data,
    setMessages: coreChat.setMessages,
  });

  // Persist fetch conversations for authenticated user
  useEffect(() => {
    if (!isNewConversation || initialMessagesForCoreChat.length === 0) return;
    if (
      conversationStatus === "success" &&
      coreChat.messages.length !== initialMessagesForCoreChat.length &&
      coreChat.id === conversation?.id
    ) {
      coreChat.setMessages(initialMessagesForCoreChat);
    }
  }, [
    initialMessagesForCoreChat.length,
    conversationStatus,
    coreChat.messages.length,
    isNewConversation,
    conversation?.id,
  ]);

  useEffect(() => {
    if (isNewConversation) {
      isFirstConversationTitleCreated.current = false;
      return;
    }

    const hasTitle = isGuest
      ? !!guestStorage.getConversation(currentConversationId || "")?.title
      : !!conversation?.title;
    isFirstConversationTitleCreated.current = hasTitle;
  }, [
    isNewConversation,
    isGuest,
    currentConversationId,
    guestStorage,
    conversation?.title,
  ]);

  /**
   * Syncs background conversation IDs by tracking which chat is currently focused and which was streaming.
   * Cleans up inactive chat instances from memory when they're no longer current or backgrounded.
   */

  const handleConversationChangeSync = (newConversationId: string) => {
    const oldConversationId = previousConversationIdRef.current;

    setBackgroundConversationIds((prevBackgroundIds) => {
      const newBackgroundIdsSet = new Set(prevBackgroundIds);

      if (oldConversationId && oldConversationId !== newConversationId) {
        const oldCoreChatInstance =
          activeChatInstances.current.get(oldConversationId);
        if (oldCoreChatInstance && oldCoreChatInstance.status === "streaming") {
          newBackgroundIdsSet.add(oldCoreChatInstance.id);
        }
      }

      // if (newConversationId) {
      //   newBackgroundIdsSet.delete(newConversationId);
      // }

      return Array.from(newBackgroundIdsSet);
    });

    if (
      newConversationId &&
      !activeChatInstances.current.has(newConversationId)
    ) {
      console.log("handleConversationChangeSync", {
        coreChat,
        newConversationId,
      });
      activeChatInstances.current.set(newConversationId, coreChat);
    }

    const allExpectedActiveIds = new Set();
    if (newConversationId) {
      allExpectedActiveIds.add(newConversationId);
    }

    Array.from(activeChatInstances.current.keys()).forEach((idInMap) => {
      if (idInMap === newConversationId) return;

      const isExpectedBackgroundChat =
        backgroundConversationIdsRef.current.includes(idInMap) ||
        (idInMap === oldConversationId &&
          activeChatInstances.current.get(oldConversationId)?.status ===
            "streaming");

      if (!isExpectedBackgroundChat) {
        const chatInstance = activeChatInstances.current.get(idInMap);
        if (chatInstance) {
          activeChatInstances.current.delete(idInMap);
        }
      }
    });

    previousConversationIdRef.current = newConversationId;
  };

  useEffect(() => {
    if (
      isGuest &&
      currentConversationId &&
      !guestStorage.getConversation(currentConversationId)?.messages.length
    ) {
      navigate("/conversations");
    }
  }, [currentConversationId, isGuest, guestStorage, navigate]);

  const setSelectedModel = useCallback((modelId: string) => {
    setSelectedModelState(modelId);
  }, []);

  const startNewConversationInstant = useCallback(
    (message: string, modelId?: string): string => {
      const effectiveModelId = modelId || selectedModel;
      const conversationId = uuidv4();

      const initialTitle =
        message.length > 50 ? `${message.slice(0, 47)}...` : message;

      try {
        flushSync(() => {
          setIsNewConversation(true);
          navigate(`/conversations/${conversationId}`, { replace: true });
        });

        setCurrentConversationId(conversationId);
        setSelectedModelState(effectiveModelId);
        setBackgroundConversationIds((prevBackgroundIds) => {
          if (prevBackgroundIds.includes(conversationId)) {
            return prevBackgroundIds;
          }

          return [...prevBackgroundIds, conversationId];
        });

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

        coreChat.setMessages([]);
        coreChat.append({ role: "user", content: message });

        return conversationId;
      } catch {
        return "";
      }
    },
    [selectedModel, navigate, isGuest, guestStorage, userId, utils, coreChat]
  );

  const switchToConversation = useCallback(
    (conversationId: string, modelId?: string) => {
      if (modelId) {
        setSelectedModelState(modelId);
      }

      flushSync(() => {
        setCurrentConversationId(conversationId);
      });

      handleConversationChangeSync(conversationId);

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

  const handleChatPageOnLoad = useCallback((conversationId: string) => {
    previousConversationIdRef.current = conversationId;
    setCurrentConversationId(conversationId);
    console.log("handleChatPageOnLoad", coreChat);
    activeChatInstances.current.set(conversationId, coreChat);
  }, []);

  const handleNewMessage = useCallback(
    (message: string) => {
      if (!currentConversationId) return;

      setBackgroundConversationIds((prevBackgroundIds) => {
        if (prevBackgroundIds.includes(currentConversationId)) {
          return prevBackgroundIds;
        }

        return [...prevBackgroundIds, currentConversationId];
      });

      if (coreChat) {
        if (isGuest) {
          guestStorage.addMessage(currentConversationId, {
            id: messageIdGenerator(),
            role: "user",
            content: message,
            createdAt: new Date(),
          });
        }
        coreChat.append({
          role: "user",
          content: message,
        });
      }
    },
    [currentConversationId, coreChat, isGuest, guestStorage]
  );

  const value: ChatContextType = {
    ...coreChat,
    selectedModel,
    setSelectedModel,
    currentConversationId,
    startNewConversationInstant,
    switchToConversation,
    isConversationLoading: conversationLoading,
    isNewConversation,
    setIsNewConversation,
    handleChatPageOnLoad,
    handleNewMessage,
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
      {backgroundConversationIds.map((convId) => (
        <BackgroundChatStreamer
          key={convId}
          conversationId={convId}
          isWebSearchEnabled={isWebSearchEnabled}
          selectedModel={selectedModel}
          isGuest={isGuest}
          onChatReady={(id, chatHelpers) =>
            activeChatInstances.current.set(id, chatHelpers)
          }
          onFinish={(message) => handleChatFinish(convId, message)}
          onToolCall={() => {}}
        />
      ))}
      {children}
    </ChatContext.Provider>
  );
}

interface BackgroundChatStreamerProps {
  conversationId: string;
  isWebSearchEnabled: boolean;
  selectedModel: string;
  isGuest: boolean;
  onChatReady: (conversationId: string, chatHelpers: UseChatHelpers) => void;
  onFinish: (message: Message) => void;
  onToolCall: (toolCall: LocationToolCall) => void;
}

function BackgroundChatStreamer({
  conversationId,
  isWebSearchEnabled,
  selectedModel,
  isGuest,
  onChatReady,
  onFinish,
  onToolCall,
}: BackgroundChatStreamerProps) {
  const isWebSearchEnabledRef = useLatestValue(isWebSearchEnabled);
  const selectedModelRef = useLatestValue(selectedModel);
  const guestStorage = useGuestStorage();

  const { conversation, status: conversationStatus } = useConversation({
    id: conversationId,
    isNewConversation: false,
  });

  const initialMessages = useMemo<AIMessage[]>(() => {
    if (isGuest) {
      const guestConversation = guestStorage.getConversation(conversationId);
      return guestConversation?.messages || [];
    } else if (conversation?.messages) {
      return toAIMessages(conversation.messages);
    }
    return [];
  }, [conversationId, isGuest, guestStorage, conversation?.messages]);

  const backgroundChat = useAIChat({
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
      onFinish(message);
    },
    onToolCall: ({ toolCall }) => {
      onToolCall(toolCall as LocationToolCall);
    },
    onError: (error) => {
      console.error(
        `Background chat error for conversation ${conversationId}:`,
        error
      );
    },
  });

  useAutoResume({
    autoResume: !isGuest && !!conversationId,
    initialMessages: backgroundChat.messages,
    experimental_resume: backgroundChat.experimental_resume,
    data: backgroundChat.data,
    setMessages: backgroundChat.setMessages,
  });

  useEffect(() => {
    onChatReady(conversationId, backgroundChat);
    return () => {};
  }, [conversationId, backgroundChat, onChatReady]);

  useEffect(() => {
    if (
      conversationStatus === "success" &&
      initialMessages.length > 0 &&
      backgroundChat.messages.length !== initialMessages.length
    ) {
      backgroundChat.setMessages(initialMessages);
    }
  }, [initialMessages, conversationStatus, backgroundChat.messages.length]);

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
    setCurrentConversationId: state.setCurrentConversationId,
    handleChatPageOnLoad: state.handleChatPageOnLoad,
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
