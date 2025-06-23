import { memo } from "react";
import { Message, UseChatHelpers } from "@ai-sdk/react";
import { MarkdownRenderer } from "@/components/mdx";
import { ReasoningDisplay } from "./reasoning-display";
import { ChatControls } from "./chat-controls";
import { WebSearchResultsDisplay } from "./content-parts/web-search-results-display";
import { LocationPermissionRequest } from "./content-parts/location-permission-request";
import type { AllToolResults } from "@/contexts/chat-context";
import { ToolInvocation } from "ai";
import { AppToolResult } from "@/lib/ai/tools";
import { LocationResultDisplay } from "./content-parts/location-result-display";
import { UnknownToolDisplay } from "./content-parts/unknown-tool-display";
import { SourceFileDisplay } from "./content-parts/source-file-display";
import { motion } from "framer-motion";

interface ChatMessageProps {
  status: UseChatHelpers["status"];
  message: Message;
  currentModel: string;
  onRetry: () => void;
  onModelChange: (modelId: string) => void;
  addToolResult: (toolResult: AllToolResults) => void;
}

export const ChatMessage = memo(function ChatMessage({
  message,
  status,
  currentModel,
  onRetry,
  onModelChange,
  addToolResult,
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

  return (
    <div className="flex w-full justify-start group relative">
      <div className="max-w-[85%] w-full space-y-3">
        {message.content && (
          <div className="text-sm leading-relaxed text-foreground-default">
            <MarkdownRenderer content={message.content} className="" />
          </div>
        )}

        {message.parts?.map((part, index) => {
          switch (part.type) {
            // case "step-start":
            //   const stepStartPart = part;
            //   return index > 0 ? (
            //     <div
            //       key={index}
            //       className="text-foreground-muted text-xs my-4 flex items-center justify-center"
            //     >
            //       <hr className="flex-grow border-t border-border-default" />
            //       <span className="mx-2">New Step</span>
            //       <hr className="flex-grow border-t border-border-default" />
            //     </div>
            //   ) : null;
            case "reasoning":
              const reasoningPart = part;
              return (
                <ReasoningDisplay
                  key={`reasoning-${index}`}
                  reasoningPart={reasoningPart}
                  isStreaming={status === "streaming"}
                />
              );
            case "tool-invocation":
              const toolInvocationPart = part;
              const toolInvocation = toolInvocationPart.toolInvocation;
              switch (toolInvocation.toolName) {
                case "web_search":
                  const webSearchInvocation = toolInvocation;
                  switch (webSearchInvocation.state) {
                    case "partial-call":
                    case "call":
                      return (
                        <WebSearchResultsDisplay
                          key={webSearchInvocation.toolCallId}
                          query={webSearchInvocation.args.query}
                          loading={true}
                        />
                      );
                    case "result":
                      const webSearchResult =
                        webSearchInvocation.result as AppToolResult;
                      return (
                        <WebSearchResultsDisplay
                          key={webSearchInvocation.toolCallId}
                          query={webSearchResult.result.query}
                          results={webSearchResult.result.results}
                          images={webSearchResult.result.images}
                          loading={false}
                          responseTime={webSearchResult.result.response_time}
                        />
                      );
                    default:
                      return null;
                  }
                case "getLocation":
                  const getLocationInvocation = toolInvocation;
                  switch (getLocationInvocation.state) {
                    case "partial-call":
                    case "call":
                      return (
                        <motion.div
                          key={getLocationInvocation.toolCallId}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center gap-2 p-2 text-base text-foreground-muted"
                        >
                          <div className="relative h-5 w-5">
                            <motion.div
                              animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.8, 0.4, 0.8],
                              }}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }}
                              className="absolute inset-0 rounded-full bg-primary/50"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="h-3 w-3 rounded-full bg-primary animate-spin-slow" />
                            </div>
                          </div>
                          <span>
                            Requesting user confirmation for location...
                          </span>
                        </motion.div>
                      );
                    case "awaiting_user_input" as unknown as ToolInvocation["state"]:
                      return (
                        <LocationPermissionRequest
                          key={getLocationInvocation.toolCallId}
                          toolCallId={getLocationInvocation.toolCallId}
                          message={getLocationInvocation.args.message}
                          onConfirm={(toolResult) => addToolResult(toolResult)}
                          onDeny={(toolResult) => addToolResult(toolResult)}
                        />
                      );
                    case "result":
                      return (
                        <LocationResultDisplay
                          key={getLocationInvocation.toolCallId}
                          result={getLocationInvocation.result}
                        />
                      );
                    default:
                      return null;
                  }
                default:
                  return (
                    <UnknownToolDisplay
                      key={toolInvocation.toolCallId}
                      toolName={toolInvocation.toolName}
                      toolInput={toolInvocation.args}
                      toolOutput={
                        "result" in toolInvocation
                          ? toolInvocation.result
                          : undefined
                      }
                    />
                  );
              }

            case "source":
              const sourcePart = part;
              const source = sourcePart.source;
              return (
                <SourceFileDisplay
                  key={source.id}
                  type="source"
                  url={source.url}
                  title={source.title}
                />
              );
            case "file":
              const filePart = part;
              return (
                <SourceFileDisplay
                  key={`file-${index}`}
                  type="file"
                  url={`data:${filePart.mimeType};base64,${filePart.data}`}
                  mimeType={filePart.mimeType}
                  data={filePart.data}
                />
              );
            default:
              return null;
          }
        })}

        <div className="absolute -bottom-8 left-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <ChatControls
            messageContent={message.content}
            currentModel={currentModel}
            onRetry={onRetry}
            onModelChange={onModelChange}
            className="bg-white/95 backdrop-blur-sm border border-slate-200/50 rounded-lg px-2 py-1 shadow-sm dark:bg-slate-800/95 dark:border-slate-700/50"
          />
        </div>
      </div>
    </div>
  );
});
