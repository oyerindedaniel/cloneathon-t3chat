import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useRef,
} from "react";
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
import {
  type Conversation,
  type Message as DBMessage,
} from "@/server/db/schema";

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

const ChatContext = createContext<ChatContextType | undefined>(undefined);

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

  const previousTitleRef = useRef<string | null>(null);
  const [selectedModel, setSelectedModelState] = useState(DEFAULT_MODEL.id);
  const [isNavigatingToNewChat, setIsNavigatingToNewChat] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  const isFirstConversation = useRef(false);

  const guestStorage = useGuestStorage();
  const isGuest = !isAuthenticated;

  // console.log("------------------------------", userId, isAuthenticated);

  const utils = api.useUtils();
  const updateTitle = api.conversations.updateTitle.useMutation();

  const { conversation, isLoading: conversationLoading } = useConversation(
    currentConversationId || undefined
  );



  const titleCompletion = useCompletion({
    api: "/api/generate-title",
    onFinish: (result) => {
      isFirstConversation.current = false;
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
    id: currentConversationId || undefined,
    initialMessages,
    sendExtraMessageFields: true,
    generateId: messageIdGenerator,
    experimental_prepareRequestBody: ({ messages, id }) => {
      return {
        message: messages[messages.length - 1],
        id,
        modelId: selectedModel,
        userLocation: {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };
    },
    onResponse: async (response) => {
      if(conversation && conversation.messages.length > 0) {
        isFirstConversation.current = false;
      }
      if (!response.ok) {
        const errorText = await response.text();
        console.log("Chat API error in context:", response.status, errorText);
        throw new Error(`Chat API error: ${response.status}`);
      }
    },
    onFinish: async (message) => {
      if (currentConversationId) {
        if (isGuest) {
          guestStorage.addMessage(currentConversationId, {
            id: message.id,
            role: "assistant",
            content: message.content,
          });
        }

        if (isFirstConversation.current) {
          await updateConversationTitle(currentConversationId, [
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
          const newConversation: Conversation & {
            lastMessage: DBMessage | null;
          } = {
            id: conversationId,
            title: initialTitle,
            model: effectiveModelId,
            userId: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastMessageAt: null,
            totalMessages: 0,
            parentConversationId: null,
            branchPointMessageId: null,
            branchLevel: 0,
            branchStatus: "active",
            isShared: false,
            shareId: null,
            lastMessage: null, // Explicitly set to null
          };

          // utils.conversations.getAll.setData(undefined, (old) => {
          //   const newConversation = {
          //     id: crypto.randomUUID(),
          //     userId: "some-user-id",
          //     title: "New Chat",
          //     model: "some-model",
          //     lastMessageAt: null,
          //     createdAt: new Date(),
          //     totalMessages: 0,
          //     branchLevel: 0,
          //     branchStatus: "active",
          //     isShared: false,
          //     lastMessage: null,
          //   };
          //   if (old) {
          //     return [newConversation, ...old] as typeof old;
          //   } else {
          //     return [newConversation] as typeof old;
          //   }
          // });
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
    [selectedModel, navigate, chat, isGuest, guestStorage, utils, userId]
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
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}
