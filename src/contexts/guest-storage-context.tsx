import { Message } from "ai";
import { createContext, useContext, useCallback, useMemo } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";

export type GuestMessage = Message;

export interface GuestConversation {
  id: string;
  title: string;
  model: string;
  messages: GuestMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface GuestChatData {
  conversations: GuestConversation[];
  totalMessages: number;
  maxMessages: number;
}

interface GuestStorageContextType {
  guestData: GuestChatData;
  conversations: GuestConversation[];
  totalMessages: number;
  maxMessages: number;
  addConversation: (
    conversation: Omit<GuestConversation, "createdAt" | "updatedAt">
  ) => GuestConversation;
  updateConversation: (id: string, updates: Partial<GuestConversation>) => void;
  addMessage: (conversationId: string, message: Message) => GuestMessage;
  deleteConversation: (id: string) => void;
  getConversation: (id: string) => GuestConversation | undefined;
  canAddMessage: () => boolean;
  getRemainingMessages: () => number;
  clearAllData: () => void;
}

const GUEST_CHAT_KEY = "t3chat_guest_data";
const MAX_GUEST_MESSAGES = 10;

const GuestStorageContext = createContext<GuestStorageContextType | undefined>(
  undefined
);

export function GuestStorageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [guestData, setGuestData, clearGuestData] =
    useLocalStorage<GuestChatData>(GUEST_CHAT_KEY, {
      conversations: [],
      totalMessages: 0,
      maxMessages: MAX_GUEST_MESSAGES,
    });

  const addConversation = useCallback(
    (conversation: Omit<GuestConversation, "createdAt" | "updatedAt">) => {
      const now = Date.now();
      const newConversation: GuestConversation = {
        ...conversation,
        createdAt: now,
        updatedAt: now,
      };

      setGuestData((prev) => ({
        ...prev,
        conversations: [newConversation, ...prev.conversations],
      }));

      return newConversation;
    },
    [setGuestData]
  );

  const updateConversation = useCallback(
    (id: string, updates: Partial<GuestConversation>) => {
      setGuestData((prev) => ({
        ...prev,
        conversations: prev.conversations.map((conv) =>
          conv.id === id ? { ...conv, ...updates, updatedAt: Date.now() } : conv
        ),
      }));
    },
    [setGuestData]
  );

  const addMessage = useCallback(
    (conversationId: string, message: Message) => {
      const messageToStore: GuestMessage = {
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt ?? new Date(),
        ...(message.parts && { parts: message.parts }),
        ...(message.annotations && { annotations: message.annotations }),
        ...(message.experimental_attachments && {
          experimental_attachments: message.experimental_attachments,
        }),
      };

      setGuestData((prev) => {
        const newTotalMessages =
          prev.totalMessages + (message.role === "assistant" ? 1 : 0);

        return {
          ...prev,
          totalMessages: newTotalMessages,
          conversations: prev.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: [...conv.messages, messageToStore],
                  updatedAt: Date.now(),
                }
              : conv
          ),
        };
      });

      return messageToStore;
    },
    [setGuestData]
  );

  const deleteConversation = useCallback(
    (id: string) => {
      setGuestData((prev) => {
        const conversationToDelete = prev.conversations.find(
          (c) => c.id === id
        );
        const assistantMessagesCount =
          conversationToDelete?.messages.filter(
            (msg) => msg.role === "assistant"
          ).length || 0;

        return {
          ...prev,
          totalMessages: Math.max(
            0,
            prev.totalMessages - assistantMessagesCount
          ),
          conversations: prev.conversations.filter((conv) => conv.id !== id),
        };
      });
    },
    [setGuestData]
  );

  const getConversation = useCallback(
    (id: string): GuestConversation | undefined => {
      const conversation = guestData.conversations.find(
        (conv) => conv.id === id
      );
      if (conversation) {
        return {
          ...conversation,
          messages: conversation.messages.map((msg) => ({
            ...msg,
          })),
        } as GuestConversation;
      }
      return undefined;
    },
    [guestData.conversations]
  );

  const canAddMessage = useCallback(() => {
    return guestData.totalMessages < guestData.maxMessages;
  }, [guestData.totalMessages, guestData.maxMessages]);

  const getRemainingMessages = useCallback(() => {
    return Math.max(0, guestData.maxMessages - guestData.totalMessages);
  }, [guestData.totalMessages, guestData.maxMessages]);

  const value = useMemo(
    () => ({
      guestData,
      conversations: guestData.conversations,
      totalMessages: guestData.totalMessages,
      maxMessages: guestData.maxMessages,
      addConversation,
      updateConversation,
      addMessage,
      deleteConversation,
      getConversation,
      canAddMessage,
      getRemainingMessages,
      clearAllData: clearGuestData,
    }),
    [
      guestData,
      addConversation,
      updateConversation,
      addMessage,
      deleteConversation,
      getConversation,
      canAddMessage,
      getRemainingMessages,
      clearGuestData,
    ]
  );

  return (
    <GuestStorageContext.Provider value={value}>
      {children}
    </GuestStorageContext.Provider>
  );
}

export function useGuestStorage() {
  const context = useContext(GuestStorageContext);
  if (context === undefined) {
    throw new Error(
      "useGuestStorage must be used within a GuestStorageProvider"
    );
  }
  return context;
}
