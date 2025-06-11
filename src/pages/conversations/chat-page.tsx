import { Button } from "@/components/ui/button";
import { GridCross } from "@/components/ui/grid-cross";
import { Send, Paperclip, Smile, MoreVertical } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useParams } from "react-router-dom";

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();

  const conversation = {
    id: id || "1",
    title: "AI Assistant Help",
    messages: [
      {
        id: "1",
        role: "user" as const,
        content: "Hello! I need help with building a React component.",
        timestamp: "2 minutes ago",
      },
      {
        id: "2",
        role: "assistant" as const,
        content:
          "I'd be happy to help you build a React component! What specific type of component are you looking to create? Are you working on something like a form, a data display, or perhaps a interactive element?",
        timestamp: "2 minutes ago",
      },
      {
        id: "3",
        role: "user" as const,
        content:
          "I want to create a reusable button component with different variants.",
        timestamp: "1 minute ago",
      },
    ],
  };

  return (
    <div className="flex flex-col h-full relative font-sans">
      <div className="auth-surface border-b border-default/50 px-6 py-4 flex-shrink-0 relative">
        <GridCross position="tl" size="sm" opacity={0.15} />
        <GridCross position="tr" size="sm" opacity={0.15} />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground-default font-sans">
              {conversation.title}
            </h1>
            <p className="text-sm text-foreground-muted font-sans">
              AI Assistant • <span className="font-mono">Online</span>
            </p>
          </div>

          <Button variant="ghost" size="icon">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {conversation.messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <Avatar className="flex-shrink-0">
              <AvatarFallback className="font-mono">
                {message.role === "user" ? "You" : "AI"}
              </AvatarFallback>
            </Avatar>

            <div
              className={`auth-surface p-4 max-w-[70%] relative ${
                message.role === "user"
                  ? "bg-primary/5 border-primary/20"
                  : "bg-surface-secondary"
              }`}
            >
              <GridCross
                position="relative"
                size="sm"
                opacity={0.05}
                className="absolute top-1 right-1"
              />

              <div className="relative z-10">
                <p className="text-foreground-default text-sm leading-relaxed font-sans">
                  {message.content}
                </p>
                <p className="text-xs text-foreground-muted mt-2 font-mono">
                  {message.timestamp}
                </p>
              </div>
            </div>
          </div>
        ))}

        <div className="flex gap-3">
          <Avatar className="flex-shrink-0">
            <AvatarFallback className="font-mono">AI</AvatarFallback>
          </Avatar>
          <div className="auth-surface p-4 relative">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-foreground-muted rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-foreground-muted rounded-full animate-pulse delay-75"></div>
              <div className="w-2 h-2 bg-foreground-muted rounded-full animate-pulse delay-150"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-surface border-t border-default/50 p-6 flex-shrink-0 relative">
        <GridCross position="bl" size="sm" opacity={0.15} />
        <GridCross position="br" size="sm" opacity={0.15} />

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <div className="auth-surface border border-default/50 rounded-xl p-3 focus-within:border-primary/50 transition-colors">
              <textarea
                placeholder="Type your message..."
                className="w-full resize-none bg-transparent text-foreground-default placeholder:text-foreground-muted focus:outline-none min-h-[20px] max-h-32 font-sans"
                rows={1}
              />

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Smile className="w-4 h-4" />
                  </Button>
                </div>

                <div className="text-xs text-foreground-muted font-mono">
                  Press Enter to send
                </div>
              </div>
            </div>
          </div>

          <Button size="lg" className="h-12 w-12 p-0 flex-shrink-0 font-sans">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
