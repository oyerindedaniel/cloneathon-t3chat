import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useLayoutEffect,
} from "react";
import { useNavigate } from "react-router-dom";
import { getErrorDisplayInfo } from "@/lib/utils/openrouter-errors";
import { useSettings } from "@/contexts/settings-context";
import { TRPCClientError } from "@trpc/client";
import type { AppRouter } from "@/server/api/root";
import { useChatSessionStatus, useChatMessages } from "@/contexts/chat-context";
import { useGuestStorage } from "@/contexts/guest-storage-context";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";

export type ErrorType = "error" | "warning" | "info";

interface AlertState {
  isOpen: boolean;
  title: string;
  message: string;
  type: ErrorType;
}

interface UseErrorAlertOptions {
  conversationId?: string;
  autoHideDuration?: number;
}

const defaultAlertState: AlertState = {
  isOpen: false,
  title: "",
  message: "",
  type: "error",
};

export function useErrorAlert(options: UseErrorAlertOptions = {}) {
  const { autoHideDuration = 5000, conversationId = "" } = options;

  const navigate = useNavigate();
  const guestStorage = useGuestStorage();
  const { isAuthenticated, user } = useAuth();

  const isGuest = !isAuthenticated;
  const { openSettings } = useSettings();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { conversationError, isConversationError } = useChatSessionStatus();
  const { error: chatError } = useChatMessages();

  const [alertState, setAlertState] = useState<AlertState>(defaultAlertState);

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startTimeout = useCallback(() => {
    clearTimeoutRef();
    timeoutRef.current = setTimeout(() => {
      setAlertState((prev) => ({ ...prev, isOpen: false }));
    }, autoHideDuration);
  }, [autoHideDuration, clearTimeoutRef]);

  const showAlert = useCallback(
    ({ title, message, type = "error" }: Omit<AlertState, "isOpen">) => {
      setAlertState({
        isOpen: true,
        title,
        message,
        type,
      });

      // startTimeout();
    },
    [startTimeout]
  );

  const hideAlert = useCallback(() => {
    clearTimeoutRef();
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  }, [clearTimeoutRef]);

  const resetTimer = useCallback(() => {
    if (alertState.isOpen) {
      // startTimeout();
    }
  }, [alertState.isOpen, startTimeout]);

  // Generic error handlers
  const handleApiError = useCallback(
    (error: Error | string | unknown, context: string = "operation") => {
      // TRPC Client Error
      if (error instanceof TRPCClientError) {
        const TRPCError = error;
        showAlert({
          title: context,
          message: TRPCError.message || "An error occurred",
          type: "error",
        });
        return;
      }

      // Try to parse structured error message from api route server (aisdk)
      if (error instanceof Error && error.message) {
        try {
          const parsedError = JSON.parse(error.message);
          if (parsedError.title && parsedError.message && parsedError.type) {
            showAlert({
              title: parsedError.title,
              message: parsedError.message,
              type: parsedError.type,
            });

            if (parsedError.shouldOpenSettings) {
              setTimeout(() => {
                openSettings("api-keys");
              }, 1000);
            }
            return;
          }
        } catch (e) {
          // Not a structured error, fall through to default handling
        }
      }

      // Fallback to default error handling
      const errorInfo = getErrorDisplayInfo(error);

      showAlert({
        title: errorInfo.title,
        message: errorInfo.message,
        type: errorInfo.type,
      });

      if (errorInfo.shouldOpenSettings) {
        setTimeout(() => {
          openSettings("api-keys");
        }, 1000);
      }
    },
    [showAlert, openSettings]
  );

  const handleStreamError = useCallback(() => {
    showAlert({
      title: "Streaming Error",
      message:
        "There was an error with the AI response stream. Please try again.",
      type: "error",
    });
  }, [showAlert]);

  const handleConversationLoadError = useCallback(() => {
    showAlert({
      title: "Conversation Error",
      message: "Failed to load conversation. Please try again.",
      type: "error",
    });
  }, [showAlert]);

  // since react router by default does not unmount. This reset conversationId tied state
  // runs before the useeffect
  useLayoutEffect(() => {
    if (conversationId) {
      setAlertState(defaultAlertState);
    }
  }, [conversationId]);

  // Handle conversation errors
  useEffect(() => {
    if (isConversationError && conversationError) {
      const error = conversationError as TRPCClientError<AppRouter>;
      const data = error.data;

      if (data?.code === "NOT_FOUND") {
        // navigate("/conversations");

        showAlert({
          title: "Conversation Error",
          message:
            error.message || "Failed to load conversation. Please try again.",
          type: "error",
        });
      } else if (data?.code === "UNAUTHORIZED") {
        navigate("/login");
      } else {
        handleConversationLoadError();
      }
    }
  }, [
    conversationError,
    isConversationError,
    navigate,
    handleConversationLoadError,
  ]);

  useEffect(() => {
    if (
      isGuest &&
      conversationId &&
      !guestStorage.getConversation(conversationId)?.messages.length
    ) {
      // navigate("/conversations");
      // setTimeout(() => {
      showAlert({
        title: "Conversation Error",
        message: "Failed to load conversation. Please try again.",
        type: "error",
      });
      // }, 150);
    }
  }, [conversationId, isGuest, guestStorage, navigate]);

  // Handle stream errors
  // useEffect(() => {
  //   if (streamStatus === "error") {
  //     handleStreamError();
  //   }
  // }, [streamStatus, handleStreamError]);

  // Handle chat errors
  useEffect(() => {
    if (chatError) {
      handleApiError(chatError, "AI chat");
    }
  }, [chatError, handleApiError]);

  useEffect(() => {
    return () => {
      clearTimeoutRef();
    };
  }, [clearTimeoutRef]);

  return {
    alertState,
    showAlert,
    hideAlert,
    resetTimer,
    handleApiError,
    handleStreamError,
    handleConversationLoadError,
  };
}
