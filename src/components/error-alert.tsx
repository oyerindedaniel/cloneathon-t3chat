import { memo } from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Info, AlertCircle, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorAlertProps {
  isOpen: boolean;
  onClose: () => void;
  variant?: "default" | "fixed";
  title: string;
  message: string;
  type?: "error" | "warning" | "info";
  onResume?: () => void;
  showResume?: boolean;
  className?: React.HTMLAttributes<HTMLDivElement>["className"];
  resetTimer?: () => void;
}

export const ErrorAlert = memo(function ErrorAlert({
  isOpen,
  onClose,
  variant = "default",
  title,
  message,
  type = "error",
  onResume,
  showResume = false,
  className,
  resetTimer,
}: ErrorAlertProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="w-4 h-4" />;
      case "info":
        return <Info className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <Alert
      variant={type}
      className={cn(
        "shadow-lg",
        variant === "default"
          ? "w-full mt-3"
          : "fixed top-[calc(var(--topbar-height)+1.5rem)] right-4 z-50 max-w-md animate-in slide-in-from-top-2 fade-in-0",
        className
      )}
      onMouseEnter={() => resetTimer?.()}
      onMouseLeave={() => resetTimer?.()}
    >
      {getIcon()}
      <div className="flex-1">
        <AlertTitle className="flex items-center justify-between">
          {title}
          <button
            onClick={onClose}
            className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Close alert"
          >
            <X className="w-4 h-4" />
          </button>
        </AlertTitle>
        <AlertDescription className="flex justify-between gap-5">
          {message}
          {showResume && onResume && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onResume();
                onClose();
              }}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Retry
            </Button>
          )}
        </AlertDescription>
      </div>
    </Alert>
  );
});
