import { cn } from "@/lib/utils";
import { Message } from "ai";
import { MarkdownRenderer } from "@/components/mdx";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
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
    <div className="flex w-full justify-start">
      <div className="max-w-[85%] text-sm leading-relaxed text-foreground-default">
        <MarkdownRenderer content={message.content} className="" />
      </div>
    </div>
  );
}
