import { useState, useCallback, useRef } from "react";

interface ToastState {
  isVisible: boolean;
  message: string;
  type: "success" | "error" | "info";
}

export function useToast() {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [toast, setToast] = useState<ToastState>({
    isVisible: false,
    message: "",
    type: "info",
  });

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startTimeout = useCallback(
    (duration: number) => {
      clearTimeoutRef();
      timeoutRef.current = setTimeout(() => {
        setToast((prev) => ({ ...prev, isVisible: false }));
      }, duration);
    },
    [clearTimeoutRef]
  );

  const showToast = useCallback(
    (
      message: string,
      type: "success" | "error" | "info" = "info",
      duration = 3000
    ) => {
      setToast({ isVisible: true, message, type });
      startTimeout(duration);
    },
    [startTimeout]
  );

  const hideToast = useCallback(() => {
    clearTimeoutRef();
    setToast((prev) => ({ ...prev, isVisible: false }));
  }, [clearTimeoutRef]);

  const resetTimer = useCallback(
    (duration = 3000) => {
      if (toast.isVisible) {
        startTimeout(duration);
      }
    },
    [toast.isVisible, startTimeout]
  );

  return {
    toast: {
      ...toast,
      resetTimer,
    },
    showToast,
    hideToast,
    resetTimer,
  };
}
