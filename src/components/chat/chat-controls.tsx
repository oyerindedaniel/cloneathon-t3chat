import { Button } from "@/components/ui/button";
import { StopCircle, RotateCcw } from "lucide-react";

interface ChatControlsProps {
  isLoading: boolean;
  hasMessages: boolean;
  onStop: () => void;
  onReload: () => void;
}

export function ChatControls({
  isLoading,
  hasMessages,
  onStop,
  onReload,
}: ChatControlsProps) {
  if (isLoading) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onStop}
        className="shrink-0"
        aria-label="Stop generation"
      >
        <StopCircle className="w-4 h-4" />
      </Button>
    );
  }

  if (hasMessages) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onReload}
        className="shrink-0"
        aria-label="Regenerate response"
      >
        <RotateCcw className="w-4 h-4" />
      </Button>
    );
  }

  return null;
}
