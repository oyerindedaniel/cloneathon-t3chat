import { useToastContext } from "@/contexts/toast-context";

export type ToastStateType = "success" | "error" | "info";

export interface ToastState {
  isVisible: boolean;
  message: string;
  type: ToastStateType;
}

export interface UseToastReturn {
  toast: ToastState & { resetTimer: (duration?: number) => void };
  showToast: (
    message: string,
    type?: ToastStateType,
    duration?: number
  ) => void;
  hideToast: () => void;
  resetTimer: (duration?: number) => void;
}

export function useToast(): UseToastReturn {
  return useToastContext();
}
