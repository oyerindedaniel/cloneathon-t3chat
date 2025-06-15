import { useState } from "react";
import { X, AlertTriangle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface MessageLimitWarningProps {
  remainingMessages: number;
  totalMessages: number;
  maxMessages: number;
  className?: React.HTMLAttributes<HTMLDivElement>["className"];
}

export function MessageLimitWarning({
  remainingMessages,
  totalMessages,
  maxMessages,
  className,
}: MessageLimitWarningProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const navigate = useNavigate();

  if (isDismissed || remainingMessages > 5) {
    return null;
  }

  const isNearLimit = remainingMessages <= 3;
  const isAtLimit = remainingMessages === 0;

  const handleSignUp = () => {
    navigate("/login");
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg border",
        isAtLimit
          ? "bg-destructive/10 border-destructive/20 text-destructive"
          : isNearLimit
          ? "bg-warning/10 border-warning/20 text-warning-foreground"
          : "bg-muted border-border text-muted-foreground",
        className
      )}
    >
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />

      <div className="flex-1 text-sm">
        {isAtLimit ? (
          <div className="space-y-2">
            <span className="font-medium block">
              Message limit reached! Sign up to continue chatting.
            </span>
            <Button
              onClick={handleSignUp}
              size="sm"
              className="h-7 px-3 text-xs font-medium"
            >
              <LogIn className="w-3 h-3 mr-1.5" />
              Sign Up / Login
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span>
              <span className="font-medium">{remainingMessages}</span> message
              {remainingMessages === 1 ? "" : "s"} remaining.{" "}
              <span className="text-xs opacity-75">
                ({totalMessages}/{maxMessages} used)
              </span>
            </span>
            <Button
              onClick={handleSignUp}
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs ml-3"
            >
              <LogIn className="w-3 h-3 mr-1" />
              Sign Up
            </Button>
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="w-6 h-6 hover:bg-background/50"
        onClick={() => setIsDismissed(true)}
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}
