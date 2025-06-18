import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getErrorDisplayInfo } from "@/lib/utils/openrouter-errors";
import type { SettingsSection } from "@/hooks/use-settings-dialog";
import { UseChatHelpers } from "@ai-sdk/react";

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
  // Settings dialog opener for API key errors
  onOpenSettings?: (section?: SettingsSection) => void;
}

export function useErrorAlert(options: UseErrorAlertOptions = {}) {
  const {
    autoHideDuration = 5000,
    conversationError,
    streamStatus,
    chatError,
    onResume,
    onOpenSettings,
  } = options;
  const navigate = useNavigate();
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
    (title: string, message: string, type: ErrorType = "error") => {
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
      // Try to parse structured error message from server
      if (error instanceof Error && error.message) {
        try {
          const parsedError = JSON.parse(error.message);
          if (parsedError.title && parsedError.message && parsedError.type) {
            showAlert(parsedError.title, parsedError.message, parsedError.type);

            // Auto-open settings if needed
            if (parsedError.shouldOpenSettings) {
              setTimeout(() => {
                onOpenSettings?.("api-keys");
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

      showAlert(errorInfo.title, errorInfo.message, errorInfo.type);

      // Auto-open settings if needed
      if (errorInfo.shouldOpenSettings) {
        setTimeout(() => {
          onOpenSettings?.("api-keys");
        }, 1000);
      }
    },
    [showAlert, onOpenSettings]
  );

  const handleStreamError = useCallback(() => {
    showAlert(
      "Streaming Error",
      "There was an error with the AI response stream. Please try again.",
      "error"
    );
  }, [showAlert]);

  const handleConversationLoadError = useCallback(() => {
    showAlert(
      "Conversation Error",
      "Failed to load conversation. Please try again.",
      "error"
    );
  }, [showAlert]);

  // Handle conversation errors
  useEffect(() => {
    if (conversationError?.isError && conversationError.error) {
      const error = conversationError.error as Record<string, unknown>;
      const data = error.data as Record<string, unknown> | undefined;

      if (data?.code === "NOT_FOUND") {
        navigate("/conversations");
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
  useEffect(() => {
    if (streamStatus === "error") {
      handleStreamError();
    }
  }, [streamStatus, handleStreamError]);

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
    alertState: {
      ...alertState,
      resetTimer,
    },
    showAlert,
    hideAlert,
    resetTimer,
    handleApiError,
    handleStreamError,
    handleConversationLoadError,
  };
}
