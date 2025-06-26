import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Copy, ChevronDown, ChevronUp, Brain } from "lucide-react";
import { useClipboard } from "@/hooks/use-clipboard";
import { ReasoningUIPart } from "@ai-sdk/ui-utils";
import { MarkdownRenderer } from "../mdx";
import { TypingDots } from "../typing-dots";

interface ReasoningDisplayProps {
  reasoningPart?: ReasoningUIPart;
  isStreaming?: boolean;
  className?: React.HTMLAttributes<HTMLDivElement>["className"];
}

export function ReasoningDisplay({
  reasoningPart,
  isStreaming = false,
  className,
}: ReasoningDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { copied, copy } = useClipboard();

  const reasoning = useMemo(() => {
    return reasoningPart?.details
      .map((detail) => (detail.type === "text" ? detail.text : "<redacted>"))
      .join("");
  }, [reasoningPart]);

  const handleCopy = async () => {
    if (!reasoning) return;
    await copy(reasoning);
  };

  if (!reasoning && !isStreaming) return null;

  return (
    <div className={cn("w-full max-w-none", className)}>
      <div
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
            {isStreaming && <TypingDots className="self-end" />}
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
          {isExpanded && (
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
                    "max-h-[300px] overflow-y-auto"
                  )}
                >
                  <MarkdownRenderer content={reasoning || ""} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {(!isExpanded || isStreaming) && reasoning && (
          <div className="p-4">
            <div className="text-xs text-foreground-muted line-clamp-2">
              {reasoning.slice(0, 150)}
              {reasoning.length > 150 && "..."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
