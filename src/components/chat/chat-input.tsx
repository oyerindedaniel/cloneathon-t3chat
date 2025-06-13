import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SendHorizontal, ImagePlus } from "lucide-react";
import { ModelSelector } from "@/components/model-selector";

interface ChatInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onImageAttach: () => void;
  selectedModel: string;
  onModelChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function ChatInput({
  value,
  onChange,
  onKeyDown,
  onSubmit,
  onImageAttach,
  selectedModel,
  onModelChange,
  disabled = false,
  placeholder = "Type your message...",
  className,
}: ChatInputProps) {
  console.log({ disabled });
  return (
    <form onSubmit={onSubmit} className={cn("max-w-2xl mx-auto", className)}>
      <div
        className={cn(
          "field-container relative flex-1 p-1.5 rounded-3xl shadow-md overflow-hidden",
          "border border-subtle bg-surface-secondary",
          "transition-all duration-200 ease-in-out",
          "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-surface-primary",
          disabled && "opacity-75"
        )}
      >
        <div className="flex items-center gap-2 w-full">
          <Input
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="flex-1 h-10 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 pl-4 text-sm pr-2"
            disabled={disabled}
          />

          <Button
            type="submit"
            variant="default"
            size="icon"
            className="w-9 h-9 shrink-0"
            disabled={!value.trim() || disabled}
            aria-label="Send message"
          >
            {disabled ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <SendHorizontal className="w-4 h-4" />
            )}
          </Button>
        </div>

        <div className="flex items-center gap-2 w-full">
          <ModelSelector
            value={selectedModel}
            onValueChange={onModelChange}
            disabled={disabled}
            variant="compact"
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="w-9 h-9 shrink-0 rounded-full"
            onClick={onImageAttach}
            disabled={disabled}
            aria-label="Attach image"
          >
            <ImagePlus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </form>
  );
}
