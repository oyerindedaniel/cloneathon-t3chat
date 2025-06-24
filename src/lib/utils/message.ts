import { Message as AIMessage } from "ai";
import { Message as DBMessage } from "@/server/db/schema";
import { tryParseJson } from "./app";

export function toAIMessage(msg: DBMessage): AIMessage {
  return {
    id: msg.aiMessageId,
    role: msg.role as AIMessage["role"],
    content: msg.content,
    createdAt: new Date(msg.createdAt),
    parts: tryParseJson<AIMessage["parts"]>(msg.parts),
    annotations: tryParseJson<AIMessage["annotations"]>(msg.annotations),
    experimental_attachments: tryParseJson<
      AIMessage["experimental_attachments"]
    >(msg.attachments),
  };
}

export function toAIMessages(messages: DBMessage[]): AIMessage[] {
  return messages.map(toAIMessage);
}
