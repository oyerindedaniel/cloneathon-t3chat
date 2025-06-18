import { memo } from "react";
import { Message } from "@ai-sdk/react";
import { MarkdownRenderer } from "@/components/mdx";
import { ReasoningDisplay } from "./reasoning-display";
import { ChatControls } from "./chat-controls";

interface ChatMessageProps {
  message: Message;
  currentModel?: string;
  onRetry?: () => void;
  onModelChange?: (modelId: string) => void;
}

export const ChatMessage = memo(function ChatMessage({
  message,
  currentModel,
  onRetry,
  onModelChange,
}: ChatMessageProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex w-full justify-end">
        <div className="relative max-w-[85%] rounded-2xl px-4 py-3 shadow-sm bg-primary text-primary-foreground rounded-br-md">
          <div className="text-sm leading-relaxed text-primary-foreground">
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
          <div className="absolute w-3 h-3 transform rotate-45 bg-primary -bottom-1 -right-1" />
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex w-full justify-start group">
      <div className="max-w-[85%] space-y-3">
        {message.parts
          ?.filter((part) => part.type === "reasoning")
          .map((part, index) => (
            <ReasoningDisplay
              key={`reasoning-${index}`}
              reasoning={part.reasoning}
              isStreaming={false}
            />
          ))}

        <div className="relative">
          <div className="text-sm leading-relaxed text-foreground-default">
            {message.content && (
              <MarkdownRenderer content={message.content} className="" />
            )}

            {/* 
            {message.parts
              ?.filter((part) => part.type === "text")
              .map((part, index) => (
                <div key={`text-${index}`} className="mt-2">
                  <MarkdownRenderer content={part.text} className="" />
                </div>
              ))} */}
          </div>

          {currentModel && onRetry && onModelChange && (
            <div className="absolute -bottom-12 left-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <ChatControls
                messageContent={message.content}
                currentModel={currentModel}
                onRetry={onRetry}
                onModelChange={onModelChange}
                className="bg-white/95 backdrop-blur-sm border border-slate-200/50 rounded-lg px-2 py-1 shadow-sm dark:bg-slate-800/95 dark:border-slate-700/50"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
