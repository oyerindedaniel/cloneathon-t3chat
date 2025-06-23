import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getErrorDisplayInfo } from "@/lib/utils/openrouter-errors";
import { UseChatHelpers } from "@ai-sdk/react";
import { useSettings } from "@/contexts/settings-context";
import { TRPCClientError } from "@trpc/client";
import type { AppRouter } from "@/server/api/root";

export type ErrorType = "error" | "warning" | "info";

interface AlertState {
  isOpen: boolean;
  title: string;
  message: string;
  type: ErrorType;
}

interface ConversationError {
  isError: boolean;
  error: unknown;
}

interface UseErrorAlertOptions {
  autoHideDuration?: number;
  // Error sources to monitor
  conversationError?: ConversationError;
  streamStatus?: UseChatHelpers["status"];
  chatError?: Error | string | null;
  // Resume function for stream errors
  onResume?: () => void;
}

export function useErrorAlert(options: UseErrorAlertOptions = {}) {
  const {
    autoHideDuration = 5000,
    conversationError,
    streamStatus,
    chatError,
    onResume,
  } = options;
  const navigate = useNavigate();
  const { openSettings } = useSettings();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    title: "",
    message: "",
    type: "error",
  });

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

      startTimeout();
    },
    [startTimeout]
  );

  const hideAlert = useCallback(() => {
    clearTimeoutRef();
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  }, [clearTimeoutRef]);

  const resetTimer = useCallback(() => {
    if (alertState.isOpen) {
      startTimeout();
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

  // Handle conversation errors
  useEffect(() => {
    if (conversationError?.isError && conversationError.error) {
      const error = conversationError.error as TRPCClientError<AppRouter>;
      const data = error.data;

      if (data?.code === "NOT_FOUND") {
        navigate("/conversations");
        setTimeout(() => {
          showAlert({
            title: "Conversation Error",
            message:
              error.message || "Failed to load conversation. Please try again.",
            type: "error",
          });
        }, 250);
      } else if (data?.code === "UNAUTHORIZED") {
        navigate("/login");
      } else {
        handleConversationLoadError();
      }
    }
  }, [
    conversationError?.isError,
    conversationError?.error,
    navigate,
    handleConversationLoadError,
  ]);

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
