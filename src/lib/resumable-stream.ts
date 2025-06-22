import { createResumableStreamContext } from "resumable-stream";
import { after } from "next/server";
import { publisher, subscriber } from "./redis";
import { db } from "@/server/db";
import { streamIds, conversations, messages } from "@/server/db/schema";
import type { Message, Attachment } from "ai";
import { eq, desc, asc } from "drizzle-orm";

export const streamContext = createResumableStreamContext({
  waitUntil: after,
  publisher,
  subscriber,
});

/**
 * Load stream IDs from database for a given chat ID
 * These are just the stream IDs - actual streams are in Redis
 */
export async function loadStreams(chatId: string): Promise<string[]> {
  try {
    const streams = await db
      .select({ streamId: streamIds.streamId })
      .from(streamIds)
      .where(eq(streamIds.conversationId, chatId))
      .orderBy(desc(streamIds.createdAt));

    return streams.map((stream) => stream.streamId);
  } catch (error) {
    console.error("Failed to load streams:", error);
    return [];
  }
}

/**
 * Store a new stream ID in the database for tracking
 * The actual stream data is in Redis
 */
export async function appendStreamId({
  chatId,
  streamId,
  userId,
}: {
  chatId: string;
  streamId: string;
  userId: string;
}): Promise<void> {
  try {
    await db.insert(streamIds).values({
      streamId,
      conversationId: chatId,
      userId,
    });
  } catch (error) {
    console.error("Failed to append stream ID:", error);
    throw error;
  }
}

/**
 * Get messages for a conversation and convert them to AI SDK format
 */
export async function getMessagesByChatId({
  id,
}: {
  id: string;
}): Promise<Message[]> {
  try {
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, id),
      with: {
        messages: {
          orderBy: asc(messages.sequenceNumber),
        },
      },
    });

    if (!conversation) {
      return [];
    }

    return conversation.messages.map((msg): Message => {
      const message: Message = {
        id: msg.aiMessageId,
        role: msg.role as Message["role"],
        content: msg.content,
        createdAt: msg.createdAt,
      };

      if (msg.parts && Array.isArray(msg.parts)) {
        (message as Message).parts = msg.parts;
      }
      if (msg.annotations && Array.isArray(msg.annotations)) {
        (message as Message).annotations = msg.annotations;
      }
      if (msg.attachments) {
        message.experimental_attachments = msg.attachments as Attachment[];
      }

      return message;
    });
  } catch (error) {
    console.error("Failed to get messages by chat ID:", error);
    return [];
  }
}
