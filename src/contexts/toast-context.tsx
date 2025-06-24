"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import type {
  ToastState,
  UseToastReturn,
  ToastStateType,
} from "@/hooks/use-toast";

type ToastContextType = UseToastReturn;

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
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
    (message: string, type: ToastStateType = "info", duration = 5000) => {
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

  const value = {
    toast: {
      ...toast,
      resetTimer,
    },
    showToast,
    hideToast,
    resetTimer,
  };

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToastContext must be used within a ToastProvider");
  }
  return context;
}
