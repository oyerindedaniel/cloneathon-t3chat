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

interface ChatContextType {
  // Chat state
  messages: Message[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
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
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const currentConservationId = useRef<string | null>(null);
  const [selectedModel, setSelectedModelState] = useState(DEFAULT_MODEL.id);
  const [isNavigatingToNewChat, setIsNavigatingToNewChat] = useState(false);

  const utils = api.useUtils();
  const createConversation = api.conversations.create.useMutation();

  const chat = useAIChat({
    api: "/api/chat",
    body: {
      conversationId: currentConservationId.current,
      modelId: selectedModel,
      userLocation: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    },
    onResponse: async (response) => {},
    onFinish: () => {},
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

      flushSync(() => {
        setIsNavigatingToNewChat(true);
        navigate(`/conversations/${conversationId}`, { replace: true });
      });

      try {
        currentConservationId.current = conversationId;
        setSelectedModelState(effectiveModelId);

        chat.setMessages([]);
        chat.append({
          role: "user",
          content: message,
        });

        return conversationId;
      } catch (error) {
        console.error("Failed to start conversation:", error);

        throw error;
      }
    },
    [createConversation, selectedModel, navigate, chat]
  );

  const switchToConversation = useCallback(
    (conversationId: string, modelId?: string) => {
      currentConservationId.current = conversationId;
      if (modelId) {
        setSelectedModelState(modelId);
      }
      setIsNavigatingToNewChat(false);
      chat.setMessages([]);
    },
    [chat]
  );

  const setCurrentConversationId = useCallback((conversationId: string) => {
    currentConservationId.current = conversationId;
  }, []);

  console.log({ chat: chat.status });

  const value: ChatContextType = {
    messages: chat.messages,
    input: chat.input,
    handleInputChange: chat.handleInputChange,
    handleSubmit: chat.handleSubmit,
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
