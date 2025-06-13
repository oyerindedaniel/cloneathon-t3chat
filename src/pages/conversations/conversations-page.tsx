import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SendHorizontal, Sparkles, ImagePlus } from "lucide-react";
import { GridCross } from "@/components/ui/grid-cross";
import { ModelSelector } from "@/components/model-selector";
import { SuggestionCard } from "@/components/suggestion-card";
import { DEFAULT_SUGGESTIONS } from "@/lib/constants/suggestions";
import { useChatContext } from "@/contexts/chat-context";

export default function ConversationsPage() {
  const [message, setMessage] = useState("");
  const {
    selectedModel,
    setSelectedModel,
    startNewConversationInstant,
    isCreatingConversation,
  } = useChatContext();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!message.trim() || isCreatingConversation) return;

      const messageToSend = message.trim();
      setMessage("");

      try {
        await startNewConversationInstant(messageToSend, selectedModel);
      } catch (error) {
        console.error("Failed to start conversation:", error);
        setMessage(messageToSend);
      }
    },
    [
      message,
      selectedModel,
      startNewConversationInstant,
      isCreatingConversation,
    ]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
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

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setMessage(suggestion);
  }, []);

  const handleImageAttach = () => {
    // TODO: Implement image attachment functionality
    console.log("Image attach clicked");
  };

  return (
    <div className="h-full flex flex-col grid-pattern-background">
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

          <form onSubmit={handleSubmit} className="w-full max-w-2xl">
            <div
              className={cn(
                "field-container relative w-full p-1.5 rounded-3xl shadow-lg overflow-hidden",
                "border border-subtle bg-surface-secondary",
                "transition-all duration-200 ease-in-out",
                "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-surface-primary",
                isCreatingConversation && "opacity-75 pointer-events-none"
              )}
            >
              <div className="flex items-center gap-2 w-full">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything..."
                  className="flex-1 h-12 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 pl-4 text-base pr-2"
                  disabled={isCreatingConversation}
                  autoFocus
                />

                <Button
                  type="submit"
                  variant="default"
                  size="icon"
                  className="w-10 h-10 shrink-0"
                  disabled={!message.trim() || isCreatingConversation}
                  aria-label="Send message"
                >
                  {isCreatingConversation ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <SendHorizontal className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-2 w-full">
                <ModelSelector
                  value={selectedModel}
                  onValueChange={setSelectedModel}
                  disabled={isCreatingConversation}
                  variant="compact"
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9 shrink-0 rounded-full"
                  onClick={handleImageAttach}
                  disabled={isCreatingConversation}
                  aria-label="Attach image"
                >
                  <ImagePlus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
            {DEFAULT_SUGGESTIONS.map((suggestion, index) => (
              <SuggestionCard
                key={index}
                title={suggestion.title}
                icon={suggestion.icon}
                onClick={() => handleSuggestionClick(suggestion.title)}
                disabled={isCreatingConversation}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
