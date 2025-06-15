import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useRef,
} from "react";
import { useChat as useAIChat } from "@ai-sdk/react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/trpc/react";
import { DEFAULT_MODEL } from "@/lib/ai/models";
import { useNavigate } from "react-router-dom";
import { Message } from "ai";
import { v4 as uuidv4 } from "uuid";
import { flushSync } from "react-dom";
import { UseChatHelpers } from "@ai-sdk/react";
import { useGuestStorage } from "@/hooks/use-local-storage";

interface ChatContextType {
  // Chat state
  messages: Message[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  append: (message: {
    role: "user" | "assistant" | "system";
    content: string;
  }) => void;
  status: UseChatHelpers["status"];
  error: Error | undefined;
  reload: () => void;
  stop: () => void;
  setMessages: (messages: Message[]) => void;

  // Model selection
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;

  // Conversation management
  currentConversationId: string | null;
  startNewConversationInstant: (
    message: string,
    modelId?: string
  ) => Promise<string>;
  switchToConversation: (conversationId: string, modelId?: string) => void;
  isCreatingConversation: boolean;

  setCurrentConversationId: (conversationId: string) => void;

  // Navigation state
  isNavigatingToNewChat: boolean;

  // Guest user support
  isGuest: boolean;
  canSendMessage: boolean;
  remainingMessages: number;
  totalMessages: number;
  maxMessages: number;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { session, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const currentConservationId = useRef<string | null>(null);
  const [selectedModel, setSelectedModelState] = useState(DEFAULT_MODEL.id);
  const [isNavigatingToNewChat, setIsNavigatingToNewChat] = useState(false);
  const previousTitleRef = useRef<string | null>(null);

  const utils = api.useUtils();
  const createConversation = api.conversations.create.useMutation();
  const updateTitle = api.conversations.updateTitle.useMutation();

  const guestStorage = useGuestStorage();
  const isGuest = !isAuthenticated;

  const generateTitle = useCallback(async (messages: Message[]) => {
    try {
      const response = await fetch("/api/generate-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) throw new Error("Failed to generate title");

      const { title } = await response.json();
      return title;
    } catch (error) {
      console.error("Title generation failed:", error);
      return null;
    }
  }, []);

  const updateConversationTitle = useCallback(
    async (conversationId: string, messages: Message[]) => {
      if (!conversationId || messages.length === 0) return;

      try {
        if (isGuest) {
          const newTitle = await generateTitle(messages);
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

          const newTitle = await generateTitle(messages);
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
    [utils, generateTitle, isGuest, guestStorage, updateTitle]
  );

  const chat = useAIChat({
    api: "/api/chat",
    body: {
      conversationId: currentConservationId.current,
      modelId: selectedModel,
      userLocation: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    },
    onResponse: async (response) => {
      if (!response.ok) {
        const errorText = await response.text();
        console.log("Chat API error in context:", response.status, errorText);

        throw new Error(`Chat API error: ${response.status}`);
      }
    },
    onFinish: async (message) => {
      if (currentConservationId.current && chat.messages.length >= 2) {
        if (isGuest) {
          guestStorage.addMessage(currentConservationId.current, {
            id: uuidv4(),
            role: "assistant",
            content: message.content,
          });
        }

        await updateConversationTitle(currentConservationId.current, [
          ...chat.messages,
          message,
        ]);
      }
    },
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  const setSelectedModel = useCallback((modelId: string) => {
    setSelectedModelState(modelId);
  }, []);

  const startNewConversationInstant = useCallback(
    async (message: string, modelId?: string): Promise<string> => {
      const effectiveModelId = modelId || selectedModel;
      const conversationId = uuidv4();

      console.log("[CHAT_CONTEXT] Starting new conversation:", {
        conversationId,
        effectiveModelId,
        messagePreview: message.slice(0, 50),
        isGuest,
        isAuthenticated,
      });

      const initialTitle =
        message.length > 50 ? `${message.slice(0, 47)}...` : message;

      console.log("[CHAT_CONTEXT] Generated initial title:", initialTitle);

      flushSync(() => {
        setIsNavigatingToNewChat(true);
        navigate(`/conversations/${conversationId}`, { replace: true });
      });

      console.log(
        "[CHAT_CONTEXT] Navigation completed, setting up conversation"
      );

      try {
        currentConservationId.current = conversationId;
        setSelectedModelState(effectiveModelId);

        if (isGuest) {
          console.log("[CHAT_CONTEXT] Setting up guest conversation");

          guestStorage.addConversation({
            id: conversationId,
            title: initialTitle,
            model: effectiveModelId,
            messages: [],
          });

          console.log("[CHAT_CONTEXT] Guest conversation added to storage");

          guestStorage.addMessage(conversationId, {
            id: uuidv4(),
            role: "user",
            content: message,
          });

          console.log("[CHAT_CONTEXT] Guest message added to storage");
        } else {
          console.log(
            "[CHAT_CONTEXT] Setting up authenticated user conversation"
          );

          const optimisticConversation = {
            id: conversationId,
            title: initialTitle,
            model: effectiveModelId,
            temperature: 0.7,
            maxTokens: 1000,
            userId: session?.user?.id || "",
            parentConversationId: null,
            branchPointMessageId: null,
            isShared: false,
            shareId: null,
            branchLevel: 0,
            totalMessages: 0,
            lastMessageAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            messages: [],
          };

          console.log(
            "[CHAT_CONTEXT] Setting optimistic conversation data:",
            optimisticConversation
          );

          utils.conversations.getById.setData(
            { id: conversationId },
            optimisticConversation
          );

          console.log(
            "[CHAT_CONTEXT] Optimistic conversation data set in cache"
          );
        }

        console.log(
          "[CHAT_CONTEXT] Clearing messages and appending user message"
        );

        chat.setMessages([]);
        chat.append({
          role: "user",
          content: message,
        });

        console.log("[CHAT_CONTEXT] Conversation setup completed successfully");

        return conversationId;
      } catch (error) {
        console.error("[CHAT_CONTEXT] Failed to start conversation:", {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          conversationId,
          isGuest,
        });
        throw error;
      }
    },
    [
      createConversation,
      selectedModel,
      navigate,
      chat,
      session,
      utils,
      isGuest,
      guestStorage,
    ]
  );

  const switchToConversation = useCallback(
    (conversationId: string, modelId?: string) => {
      currentConservationId.current = conversationId;
      if (modelId) {
        setSelectedModelState(modelId);
      }
      setIsNavigatingToNewChat(false);

      if (isGuest) {
        const guestConversation = guestStorage.getConversation(conversationId);
        if (guestConversation) {
          const aiMessages: Message[] = guestConversation.messages.map(
            (msg) => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              createdAt: new Date(msg.timestamp),
            })
          );
          chat.setMessages(aiMessages);
        } else {
          chat.setMessages([]);
        }
      } else {
        chat.setMessages([]);
      }
    },
    [chat, isGuest, guestStorage]
  );

  const setCurrentConversationId = useCallback((conversationId: string) => {
    currentConservationId.current = conversationId;
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      if (isGuest && !guestStorage.canAddMessage()) {
        e.preventDefault();
        return;
      }

      if (isGuest && currentConservationId.current && chat.input.trim()) {
        guestStorage.addMessage(currentConservationId.current, {
          id: uuidv4(),
          role: "user",
          content: chat.input.trim(),
        });
      }

      chat.handleSubmit(e);
    },
    [chat, isGuest, guestStorage]
  );

  console.log({ chat: chat.status });

  const value: ChatContextType = {
    messages: chat.messages,
    input: chat.input,
    handleInputChange: chat.handleInputChange,
    handleSubmit,
    append: chat.append,
    status: chat.status,
    error: chat.error,
    reload: chat.reload,
    stop: chat.stop,
    setMessages: chat.setMessages,

    selectedModel,
    setSelectedModel,

    currentConversationId: currentConservationId.current,
    startNewConversationInstant,
    switchToConversation,
    isCreatingConversation: createConversation.isPending,

    isNavigatingToNewChat,

    setCurrentConversationId,

    // Guest user support
    isGuest,
    canSendMessage: isGuest ? guestStorage.canAddMessage() : true,
    remainingMessages: isGuest ? guestStorage.getRemainingMessages() : Infinity,
    totalMessages: isGuest ? guestStorage.totalMessages : 0,
    maxMessages: isGuest ? guestStorage.maxMessages : Infinity,
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
