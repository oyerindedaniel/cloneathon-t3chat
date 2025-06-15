import { Button } from "@/components/ui/button";
import { Copy, RotateCcw, Zap } from "lucide-react";
import { ModelSwitcher } from "@/components/model-switcher";
import { cn } from "@/lib/utils";
import { useClipboard } from "@/hooks/use-clipboard";

interface ChatControlsProps {
  messageContent: string;
  currentModel: string;
  onRetry: () => void;
  onModelChange: (modelId: string) => void;
  className?: React.HTMLAttributes<HTMLDivElement>["className"];
}

export function ChatControls({
  messageContent,
  currentModel,
  onRetry,
  onModelChange,
  className,
}: ChatControlsProps) {
  const { copied, copy } = useClipboard();

  const handleCopy = async () => {
    await copy(messageContent);
  };

  const handleRetryWithModel = (modelId: string) => {
    onModelChange(modelId);
    onRetry();
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="h-7 px-2 text-xs text-foreground-subtle hover:text-foreground-default hover:bg-surface-hover"
      >
        <Copy className="w-3 h-3 mr-1" />
        {copied ? "Copied!" : "Copy"}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onRetry}
        className="h-7 px-2 text-xs text-foreground-subtle hover:text-foreground-default hover:bg-surface-hover"
      >
        <RotateCcw className="w-3 h-3 mr-1" />
        Retry
      </Button>

      <div className="flex items-center gap-1">
        <Zap className="w-3 h-3 text-foreground-muted" />
        <ModelSwitcher
          currentModel={currentModel}
          onModelChange={handleRetryWithModel}
        />
      </div>
    </div>
  );
}
