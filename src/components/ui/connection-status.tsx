"use client";

import { useState, useEffect, memo } from "react";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface ConnectionStatusProps {
  isConnected: boolean;
  isResuming?: boolean;
  onRetry?: () => void;
  className?: React.HTMLAttributes<HTMLDivElement>["className"];
}

function ConnectionStatusComponent({
  isConnected,
  isResuming = false,
  onRetry,
  className,
}: ConnectionStatusProps) {
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    if (!isConnected || isResuming) {
      setShowStatus(true);
    } else {
      const timer = setTimeout(() => setShowStatus(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, isResuming]);

  if (!showStatus) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          "fixed top-[calc(var(--topbar-height)+1.5rem)] right-4 z-50 flex items-center gap-3",
          "px-4 py-3",
          "rounded-lg border shadow-lg backdrop-blur-sm",
          isConnected
            ? "border-connection-success bg-surface-secondary/90 text-foreground-default border-l-4 border-l-connection-success"
            : "border-connection-error bg-surface-tertiary/90 text-foreground-default border-l-4 border-l-connection-error",
          isResuming &&
            "border-connection-resuming border-l-connection-resuming",
          className
        )}
      >
        <div className="flex items-center gap-2">
          {isResuming ? (
            <RotateCcw className="h-4 w-4 animate-spin text-connection-resuming" />
          ) : isConnected ? (
            <Wifi className="h-4 w-4 text-connection-success" />
          ) : (
            <WifiOff className="h-4 w-4 text-connection-error" />
          )}

          <span className="text-sm font-medium text-foreground-default">
            {isResuming
              ? "Resuming conversation..."
              : isConnected
              ? "Connected"
              : "Connection lost"}
          </span>
        </div>

        {!isConnected && !isResuming && onRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            className="h-7 px-2 text-xs"
          >
            Retry
          </Button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function areEqual(
  prev: ConnectionStatusProps,
  next: ConnectionStatusProps
): boolean {
  return (
    prev.isConnected === next.isConnected &&
    prev.isResuming === next.isResuming &&
    prev.className === next.className
  );
}

export const ConnectionStatus = memo(ConnectionStatusComponent, areEqual);
