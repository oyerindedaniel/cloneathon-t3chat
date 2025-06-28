"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SendHorizontal, Sparkles, ImagePlus, Globe2 } from "lucide-react";
import { GridCross } from "@/components/ui/grid-cross";
import { ModelSelector } from "@/components/model-selector";
import { SuggestionCard } from "@/components/suggestion-card";
import { MessageLimitWarning } from "@/components/message-limit-warning";
import { DEFAULT_SUGGESTIONS } from "@/lib/constants/suggestions";
import {
  useChatConfig,
  useChatControls,
  useChatSessionStatus,
} from "@/contexts/chat-context";
import { useUncontrolledInputEmpty } from "@/hooks/use-uncontrolled-input-empty";
import { useAutosizeTextArea } from "@/hooks/use-autosize-textarea";
import { useCombinedRefs } from "@/hooks/use-combined-ref";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useChatMessages } from "@/contexts/chat-context";

export default function ConversationsPage() {
  const {
    selectedModel,
    setSelectedModel,
    isWebSearchEnabled,
    toggleWebSearch,
  } = useChatConfig();
  const { startNewConversationInstant } = useChatControls();
  const { status } = useChatMessages();

  const {
    isGuest,
    canSendMessage,
    remainingMessages,
    totalMessages,
    maxMessages,
  } = useChatSessionStatus();

  const isAtLimit = isGuest && !canSendMessage;

  const isProcessing = status === "streaming" || status === "submitted";

  const effectiveDisabled = isAtLimit || isProcessing;

  const [autosizeRef, resize] = useAutosizeTextArea(130);

  const [emptyRef, isEmpty, , , updateIsEmptyState] =
    useUncontrolledInputEmpty();

  const textAreaRef = useCombinedRefs(autosizeRef, emptyRef);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const inputRef = emptyRef.current;

      if (!inputRef) return;

      const message = inputRef.value;

      if (!message || !message.trim() || isAtLimit) return;

      const messageToSend = message.trim();

      inputRef.value = "";

      try {
        startNewConversationInstant(messageToSend, selectedModel);
      } catch (error) {
        console.error("Failed to start conversation:", error);
        inputRef.value = messageToSend;
      }
    },
    [selectedModel, startNewConversationInstant, isAtLimit]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const formEvent = new Event("submit", {
          bubbles: true,
          cancelable: true,
        }) as unknown as React.FormEvent<HTMLFormElement>;
        void handleSubmit(formEvent);
      }
    },
    [handleSubmit]
  );

  const createClickHandler = useCallback(
    (title: string) => () => {
      const inputRef = emptyRef.current;
      if (!isAtLimit && inputRef) {
        inputRef.value = title;
        updateIsEmptyState();
      }
    },
    [isAtLimit, updateIsEmptyState]
  );

  const handleImageAttach = () => {
    // TODO: Implement image attachment functionality
    console.log("Image attach clicked");
  };

  const handleWebSearchToggle = useCallback(() => {
    toggleWebSearch();
  }, [toggleWebSearch]);

  return (
    <div className="h-full flex flex-col grid-pattern-background not-only-of-type:w-full">
      <div className="flex-grow p-4 overflow-hidden relative">
        <GridCross
          style={{
            left: `calc(3 * var(--grid-size) - (var(--cross-size) / 2))`,
            top: `calc(4 * var(--grid-size) - (var(--cross-size) / 2))`,
          }}
        />
        <div className="flex flex-col items-center justify-center h-full gap-8 max-w-4xl mx-auto">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-primary">
              <Sparkles className="w-8 h-8" />
              <h1 className="text-3xl font-bold tracking-tight">T3 Chat</h1>
            </div>
            <p className="text-foreground-muted text-lg max-w-2xl">
              Ask me anything and I'll help you with coding, analysis, creative
              writing, and more.
            </p>
          </div>

          <div className="w-full max-w-2xl space-y-4">
            {isGuest && (
              <MessageLimitWarning
                remainingMessages={remainingMessages}
                totalMessages={totalMessages}
                maxMessages={maxMessages}
              />
            )}

            <form onSubmit={handleSubmit}>
              <div
                className={cn(
                  "field-container relative w-full p-1.5 rounded-3xl shadow-lg overflow-hidden",
                  "border border-subtle bg-surface-secondary",
                  "transition-all duration-200 ease-in-out",
                  "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-surface-primary",
                  effectiveDisabled && "opacity-75"
                )}
              >
                <div className="flex items-center gap-2 w-full">
                  <Textarea
                    ref={textAreaRef}
                    defaultValue={""}
                    onInput={resize}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isAtLimit
                        ? "Sign up to continue chatting..."
                        : "Ask me anything..."
                    }
                    className="flex-1 h-12 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 pl-4 text-base pr-2"
                    disabled={effectiveDisabled}
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-8 w-full justify-between">
                  <div className="flex items-center gap-2">
                    <ModelSelector
                      value={selectedModel}
                      onValueChange={setSelectedModel}
                      disabled={effectiveDisabled}
                      variant="compact"
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "w-9 h-9 shrink-0 rounded-full",
                            isWebSearchEnabled && "bg-primary/50 text-primary"
                          )}
                          onClick={handleWebSearchToggle}
                          disabled={effectiveDisabled}
                          aria-label="Toggle web search"
                        >
                          <Globe2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-primary/80 text-white">
                        Web search
                      </TooltipContent>
                    </Tooltip>

                    {/* <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="w-9 h-9 shrink-0 rounded-full"
                      onClick={handleImageAttach}
                      disabled={effectiveDisabled}
                      aria-label="Attach image"
                    >
                      <ImagePlus className="w-4 h-4" />
                    </Button> */}
                  </div>
                  <Button
                    type="submit"
                    variant="default"
                    size="icon"
                    className="w-10 h-10 shrink-0"
                    disabled={isEmpty || effectiveDisabled}
                    aria-label="Send message"
                  >
                    {isProcessing ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <SendHorizontal className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
            {DEFAULT_SUGGESTIONS.map((suggestion, index) => (
              <SuggestionCard
                key={index}
                title={suggestion.title}
                icon={suggestion.icon}
                onClick={createClickHandler(suggestion.title)}
                disabled={effectiveDisabled}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
