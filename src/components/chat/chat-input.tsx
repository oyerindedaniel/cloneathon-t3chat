import { memo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SendHorizontal, ImagePlus, Square } from "lucide-react";
import { ModelSelector } from "@/components/model-selector";
import { MessageLimitWarning } from "@/components/message-limit-warning";
import { useUncontrolledInputEmpty } from "@/hooks/use-uncontrolled-input-empty";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  onImageAttach: () => void;
  selectedModel: string;
  onModelChange: (value: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: React.HTMLAttributes<HTMLDivElement>["className"];

  isGuest?: boolean;
  remainingMessages?: number;
  totalMessages?: number;
  maxMessages?: number;
}

export const ChatInput = memo(function ChatInput({
  onSubmit,
  onImageAttach,
  selectedModel,
  onModelChange,
  onStop,
  disabled = false,
  placeholder = "Type your message...",
  className,
  isGuest = false,
  remainingMessages = Infinity,
  totalMessages = 0,
  maxMessages = Infinity,
}: ChatInputProps) {
  const isAtLimit = isGuest && remainingMessages === 0;
  const effectiveDisabled = disabled || isAtLimit;

  const [inputRef, isEmpty, _, handleSubmit] = useUncontrolledInputEmpty();

  const handleFormSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (effectiveDisabled) return;

      handleSubmit(onSubmit);
    },
    [effectiveDisabled, handleSubmit, onSubmit]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !effectiveDisabled) {
        e.preventDefault();
        handleSubmit(onSubmit);
      }
    },
    [effectiveDisabled, handleSubmit, onSubmit]
  );

  return (
    <div className={cn("max-w-2xl mx-auto space-y-3", className)}>
      {isGuest && (
        <MessageLimitWarning
          remainingMessages={remainingMessages}
          totalMessages={totalMessages}
          maxMessages={maxMessages}
        />
      )}

      <form onSubmit={handleFormSubmit}>
        <div
          className={cn(
            "field-container relative flex-1 p-1.5 rounded-3xl shadow-md overflow-hidden",
            "border border-subtle bg-surface-secondary",
            "transition-all duration-200 ease-in-out",
            "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-surface-primary",
            effectiveDisabled && "opacity-75"
          )}
        >
          <div className="flex items-center gap-2 w-full">
            <Input
              ref={inputRef}
              onKeyDown={handleKeyDown}
              placeholder={
                isAtLimit ? "Sign up to continue chatting..." : placeholder
              }
              className="flex-1 h-10 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 pl-4 text-sm pr-2"
              disabled={effectiveDisabled}
              readOnly={effectiveDisabled}
            />

            {disabled && onStop ? (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="w-9 h-9 shrink-0"
                onClick={onStop}
                aria-label="Stop generation"
              >
                <Square className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                variant="default"
                size="icon"
                className="w-9 h-9 shrink-0"
                disabled={isEmpty || effectiveDisabled}
                aria-label="Send message"
              >
                {disabled ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <SendHorizontal className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full">
            <ModelSelector
              value={selectedModel}
              onValueChange={onModelChange}
              disabled={effectiveDisabled}
              variant="compact"
            />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="w-9 h-9 shrink-0 rounded-full"
              onClick={onImageAttach}
              disabled={effectiveDisabled}
              aria-label="Attach image"
            >
              <ImagePlus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
});
