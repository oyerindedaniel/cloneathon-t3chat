import { useToastContext } from "@/contexts/toast-context";

export interface ToastState {
  isVisible: boolean;
  message: string;
  type: "success" | "error" | "info";
}

export interface UseToastReturn {
  toast: ToastState & { resetTimer: (duration?: number) => void };
  showToast: (
    message: string,
    type?: "success" | "error" | "info",
    duration?: number
  ) => void;
  hideToast: () => void;
  resetTimer: (duration?: number) => void;
}

export function useToast(): UseToastReturn {
  return useToastContext();
}
