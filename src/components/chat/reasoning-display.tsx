import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Copy, ChevronDown, ChevronUp, Brain } from "lucide-react";
import { useClipboard } from "@/hooks/use-clipboard";

interface ReasoningDisplayProps {
  reasoning?: string;
  isStreaming?: boolean;
  className?: React.HTMLAttributes<HTMLDivElement>["className"];
}

export function ReasoningDisplay({
  reasoning,
  isStreaming = false,
  className,
}: ReasoningDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [displayText, setDisplayText] = useState("");
  const { copied, copy } = useClipboard();

  useEffect(() => {
    if (!reasoning) return;

    if (isStreaming) {
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex < reasoning.length) {
          setDisplayText(reasoning.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(interval);
        }
      }, 20);

      return () => clearInterval(interval);
    } else {
      setDisplayText(reasoning);
    }
  }, [reasoning, isStreaming]);

  const handleCopy = async () => {
    if (!reasoning) return;
    await copy(reasoning);
  };

  if (!reasoning && !isStreaming) return null;

  return (
    <div className={cn("w-full max-w-none", className)}>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(
          "relative rounded-xl border border-subtle bg-surface-secondary/50 backdrop-blur-sm overflow-hidden",
          "shadow-sm"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-subtle">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Brain className="w-4 h-4 text-primary" />
              {isStreaming && (
                <motion.div
                  className="absolute inset-0 w-4 h-4 rounded-full bg-primary/20"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              )}
            </div>
            <span className="text-sm font-medium text-foreground-default">
              {isStreaming ? "Reasoning..." : "Reasoning"}
            </span>
            {isStreaming && (
              <div className="flex gap-1">
                <motion.div
                  className="w-1 h-1 bg-primary rounded-full"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                />
                <motion.div
                  className="w-1 h-1 bg-primary rounded-full"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div
                  className="w-1 h-1 bg-primary rounded-full"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              disabled={!reasoning}
              className="h-7 px-2 text-xs text-foreground-subtle hover:text-foreground-default hover:bg-surface-hover"
            >
              <Copy className="w-3 h-3 mr-1" />
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              disabled={!reasoning}
              className="h-7 px-2 text-foreground-subtle hover:text-foreground-default hover:bg-surface-hover"
            >
              {isExpanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {(isExpanded || isStreaming) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="p-4">
                <div
                  className={cn(
                    "relative text-sm text-foreground-default leading-relaxed",
                    "max-h-[300px] overflow-y-auto",
                    !isExpanded && !isStreaming && "line-clamp-3"
                  )}
                >
                  {isStreaming && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-surface-secondary/80 pointer-events-none"
                      style={{
                        maskImage: `linear-gradient(to right, transparent ${Math.min(
                          (displayText.length / (reasoning?.length || 1)) * 100,
                          90
                        )}%, white 100%)`,
                        WebkitMaskImage: `linear-gradient(to right, transparent ${Math.min(
                          (displayText.length / (reasoning?.length || 1)) * 100,
                          90
                        )}%, white 100%)`,
                      }}
                      animate={{
                        opacity: [0.3, 0.6, 0.3],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  )}

                  <pre className="whitespace-pre-wrap font-mono text-xs text-foreground-subtle">
                    {displayText || reasoning}
                  </pre>
                </div>

                {!isExpanded && reasoning && reasoning.length > 200 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(true)}
                    className="mt-2 h-6 px-2 text-xs text-foreground-subtle hover:text-foreground-default hover:bg-surface-hover"
                  >
                    Show more
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isExpanded && !isStreaming && reasoning && (
          <div className="p-4">
            <div className="text-xs text-foreground-muted line-clamp-2">
              {reasoning.slice(0, 150)}
              {reasoning.length > 150 && "..."}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
