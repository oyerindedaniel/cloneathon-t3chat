import { useState, useCallback } from "react";
import type { Message } from "ai";

/**
 * Custom hook for managing localStorage with TypeScript support
 * Provides automatic JSON serialization/deserialization and error handling
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;

        setStoredValue(valueToStore);

        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

/**
 * Hook specifically for managing guest conversations in localStorage
 */
export interface GuestMessage extends Message {
  timestamp: number;
}

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

const GUEST_CHAT_KEY = "t3chat_guest_data";
const MAX_GUEST_MESSAGES = 10;

export function useGuestStorage() {
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
    (conversationId: string, message: Omit<GuestMessage, "timestamp">) => {
      const messageWithTimestamp: GuestMessage = {
        ...message,
        timestamp: Date.now(),
      };

      setGuestData((prev) => {
        const newTotalMessages = prev.totalMessages + 1;

        return {
          ...prev,
          totalMessages: newTotalMessages,
          conversations: prev.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: [...conv.messages, messageWithTimestamp],
                  updatedAt: Date.now(),
                }
              : conv
          ),
        };
      });

      return messageWithTimestamp;
    },
    [setGuestData]
  );

  const deleteConversation = useCallback(
    (id: string) => {
      setGuestData((prev) => {
        const conversationToDelete = prev.conversations.find(
          (c) => c.id === id
        );
        const messagesCount = conversationToDelete?.messages.length || 0;

        return {
          ...prev,
          totalMessages: Math.max(0, prev.totalMessages - messagesCount),
          conversations: prev.conversations.filter((conv) => conv.id !== id),
        };
      });
    },
    [setGuestData]
  );

  const getConversation = useCallback(
    (id: string): GuestConversation | undefined => {
      return guestData.conversations.find((conv) => conv.id === id);
    },
    [guestData.conversations]
  );

  const canAddMessage = useCallback(() => {
    return guestData.totalMessages < guestData.maxMessages;
  }, [guestData.totalMessages, guestData.maxMessages]);

  const getRemainingMessages = useCallback(() => {
    return Math.max(0, guestData.maxMessages - guestData.totalMessages);
  }, [guestData.totalMessages, guestData.maxMessages]);

  return {
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
  };
}
