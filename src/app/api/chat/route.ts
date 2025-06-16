import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  streamText,
  convertToCoreMessages,
  smoothStream,
  createDataStream,
  generateId,
  appendResponseMessages,
  appendClientMessage,
  createIdGenerator,
  tool,
} from "ai";
import { z } from "zod";
import { getSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { conversations, messages, type NewMessage } from "@/server/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import {
  generateSystemMessage,
  detectConversationContext,
} from "@/lib/ai/system-message";
import type { Message } from "ai";
import { cookies, headers } from "next/headers";
import { getErrorDisplayInfo } from "@/lib/utils/openrouter-errors";
import {
  streamContext,
  loadStreams,
  appendStreamId,
  getMessagesByChatId,
} from "@/lib/resumable-stream";
import { buildExcludedSetClause } from "@/lib/utils/upsert";

export const maxDuration = 60;

const REASONING_MODELS = new Set([
  "deepseek/deepseek-r1",
  "deepseek/deepseek-r1:free",
  "deepseek/deepseek-r1-distill-llama-70b",
  "microsoft/phi-4-reasoning-plus:free",
  "anthropic/claude-3.7-sonnet",
  "google/gemini-flash-thinking-exp",
  "openai/o1-preview",
  "openai/o1-mini",
  "x-ai/grok-2-reasoning-beta",
]);

const serverMessageIdGenerator = createIdGenerator({
  prefix: "msgs",
  size: 16,
});

function supportsReasoning(modelId: string): boolean {
  const [base] = modelId.split("@")[0].split(":");
  return Array.from(REASONING_MODELS).some((model) => model.startsWith(base));
}

async function getApiKey(): Promise<string> {
  const cookieStore = await cookies();
  const userApiKey = cookieStore.get("apikey_openrouter");

  return userApiKey?.value || process.env.OPENROUTER_API_KEY!;
}

async function saveChat({
  id,
  messages: chatMessages,
  modelId,
  userId,
  responseTime,
  usage,
}: {
  id: string;
  messages: Message[];
  modelId: string;
  userId: string;
  responseTime?: number;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}) {
  try {
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || undefined;
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIP = headersList.get("x-real-ip");
    const ipAddress = forwardedFor?.split(",")[0] || realIP || undefined;

    const conversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);

    if (!conversation[0]) {
      const firstUserMessage = chatMessages.find((msg) => msg.role === "user");
      const title =
        firstUserMessage?.content?.slice(0, 50) +
          (firstUserMessage?.content && firstUserMessage.content.length > 50
            ? "..."
            : "") || "New Chat";

      await db.insert(conversations).values({
        id,
        title,
        model: modelId,
        userId,
        totalMessages: chatMessages.length,
        lastMessageAt: new Date(),
      });
    }

    const lastMessage = await db
      .select({ sequenceNumber: messages.sequenceNumber })
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(desc(messages.sequenceNumber))
      .limit(1);

    let nextSequence = (lastMessage[0]?.sequenceNumber ?? 0) + 1;

    for (const message of chatMessages) {
      const existingMessage = await db
        .select()
        .from(messages)
        .where(eq(messages.aiMessageId, message.id))
        .limit(1);

      if (!existingMessage[0]) {
        const messageMetadata = {
          model: modelId,
          timestamp: new Date().toISOString(),
          ...(userAgent && { userAgent }),
          ...(ipAddress && { ipAddress }),
          ...(responseTime && message.role === "assistant" && { responseTime }),
          ...(usage &&
            message.role === "assistant" && {
              tokenUsage: {
                prompt: usage.promptTokens,
                completion: usage.completionTokens,
                total: usage.totalTokens,
              },
            }),
          ...(supportsReasoning(modelId) &&
            message.role === "assistant" && {
              reasoning: true,
            }),
        };

        const messageData: NewMessage = {
          aiMessageId: message.id,
          conversationId: id,
          role: message.role as Message["role"],
          content: message.content,
          sequenceNumber: nextSequence++,
          metadata: messageMetadata,
          parts: message.experimental_attachments
            ? JSON.stringify(message.experimental_attachments)
            : null,
          annotations: message.annotations
            ? JSON.stringify(message.annotations)
            : null,
        };

        await db
          .insert(messages)
          .values(messageData)
          .onConflictDoUpdate({
            target: messages.aiMessageId,
            set: buildExcludedSetClause(messages, [
              "content",
              "sequenceNumber",
              "metadata",
              "parts",
              "annotations",
              "updatedAt",
            ]),
          });
      }
    }

    await db
      .update(conversations)
      .set({
        updatedAt: new Date(),
        lastMessageAt: new Date(),
        totalMessages: chatMessages.length,
      })
      .where(eq(conversations.id, id));
  } catch (error) {
    console.error("Error saving chat:", error);
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");

    console.log("chatId-------------------------------------", chatId);

    if (!chatId) {
      return new Response("chatId is required", { status: 400 });
    }

    const streamIds = await loadStreams(chatId);

    if (!streamIds.length) {
      return new Response("No streams found", { status: 404 });
    }

    const recentStreamId = streamIds.at(-1);

    if (!recentStreamId) {
      return new Response("No recent stream found", { status: 404 });
    }

    const emptyDataStream = createDataStream({
      execute: () => {},
    });

    const stream = await streamContext.resumableStream(
      recentStreamId,
      () => emptyDataStream
    );

    if (stream) {
      return new Response(stream, { status: 200 });
    }

    const chatMessages = await getMessagesByChatId({ id: chatId });
    const mostRecentMessage = chatMessages.at(-1);

    if (!mostRecentMessage || mostRecentMessage.role !== "assistant") {
      return new Response(emptyDataStream, { status: 200 });
    }

    const streamWithMessage = createDataStream({
      execute: (buffer) => {
        buffer.writeData({
          type: "append-message",
          message: JSON.stringify(mostRecentMessage),
        });
      },
    });

    return new Response(streamWithMessage, { status: 200 });
  } catch (error) {
    console.error("GET /api/chat error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const isAuthenticated = !!session?.user;

    const {
      message: lastMessage,
      id: conversationId,
      modelId,
      userLocation,
    } = await req.json();

    if (!lastMessage) {
      return new Response("Message is required", { status: 400 });
    }

    if (!modelId) {
      return new Response("Model ID is required", { status: 400 });
    }

    if (isAuthenticated && !session?.user?.id) {
      return new Response(
        JSON.stringify({
          error: "INVALID_SESSION",
          message: "Invalid user session",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const apiKey = await getApiKey();
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "API_KEY_MISSING",
          message:
            "OpenRouter API key is required. Please add your API key in settings.",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const openrouter = createOpenRouter({
      apiKey,
    });

    const webSearchTool = tool({
      description: "Search the web for information using a search engine.",
      parameters: z.object({
        query: z.string().describe("The search query for the web search."),
      }),
      execute: async ({ query }) => {
        const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
        const GOOGLE_CX = process.env.GOOGLE_SEARCH_ENGINE_ID;

        if (!GOOGLE_API_KEY || !GOOGLE_CX) {
          console.error(
            "Google Custom Search API key or Engine ID is not configured."
          );
          return {
            error:
              "Web search is not configured. Please set GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID.",
          };
        }

        try {
          const response = await fetch(
            `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(
              query
            )}`,
            {
              method: "GET",
              headers: {
                Accept: "application/json",
              },
            }
          );

          if (!response.ok) {
            const errorBody = await response.text();
            console.error(
              `Google Search API error: ${response.status} - ${errorBody}`
            );
            return {
              error: `Failed to fetch search results: ${response.statusText}`,
            };
          }

          const data = await response.json();

          if (data.items && Array.isArray(data.items)) {
            return {
              results: data.items.map((item: any) => ({
                title: item.title,
                url: item.link,
                snippet: item.snippet,
              })),
            };
          } else {
            return { results: [] };
          }
        } catch (error) {
          console.error("Error during web search execution:", error);
          return { error: "An unexpected error occurred during web search." };
        }
      },
    });

    let previousMessages: Message[] = [];

    if (isAuthenticated && conversationId && session?.user?.id) {
      const existingConversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (!existingConversation[0]) {
        const title =
          lastMessage.content?.slice(0, 50) +
            (lastMessage.content && lastMessage.content.length > 50
              ? "..."
              : "") || "New Chat";

        await db.insert(conversations).values({
          id: conversationId,
          title,
          model: modelId,
          userId: session.user.id,
          totalMessages: 0,
          lastMessageAt: new Date(),
        });
      }

      const dbMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(asc(messages.sequenceNumber));

      previousMessages = dbMessages.map((msg) => ({
        id: msg.aiMessageId,
        role: msg.role as Message["role"],
        content: msg.content,
        createdAt: new Date(msg.createdAt),
      }));
    }

    const allMessages = appendClientMessage({
      messages: previousMessages,
      message: lastMessage,
    });

    const conversationContext = detectConversationContext(
      allMessages.map((msg) => ({
        content: msg.content,
        role: msg.role as Message["role"],
      }))
    );

    const systemMessage = generateSystemMessage({
      modelId,
      userTimezone: userLocation?.timezone,
      userLocation: userLocation?.city
        ? `${userLocation.city}, ${userLocation.country}`
        : userLocation?.country,
      conversationContext,
    });

    const coreMessages = convertToCoreMessages([
      { role: "system", content: systemMessage },
      lastMessage,
    ]);

    const streamId = generateId();

    if (isAuthenticated && conversationId && session?.user?.id) {
      await appendStreamId({
        chatId: conversationId,
        streamId,
        userId: session.user.id,
      });
    }

    const requestStartTime = performance.now();

    if (isAuthenticated && conversationId && session?.user?.id) {
      const userMessage = allMessages[allMessages.length - 1];
      if (userMessage && userMessage.role === "user") {
        await saveChat({
          id: conversationId,
          messages: [userMessage],
          modelId,
          userId: session.user.id,
        });
      }
    }

    const stream = createDataStream({
      execute: (dataStream) => {
        const result = streamText({
          model: openrouter.chat(modelId),
          messages: coreMessages,
          temperature: 0.7,
          maxTokens: 1000,
          experimental_transform: smoothStream(),
          experimental_generateMessageId: serverMessageIdGenerator,
          toolChoice: 'auto',
          // tools: webSearchEnabled ? { webSearch: webSearchTool } : undefined, // Conditionally enable web search
          // maxSteps: webSearchEnabled ? 5 : 1, // Allow multi-step if web search is enabled
          ...(supportsReasoning(modelId) && {
            reasoning: {
              effort: "high",
              exclude: false,
            },
          }),
          onError({ error }) {
            const errorInfo = getErrorDisplayInfo(error);
            console.error(
              "Streaming error:",
              errorInfo.title,
              errorInfo.message
            );
          },
          onChunk: (event) => {

            if(event.chunk.type === "text-delta"){
              console.log("----------------------text",event.chunk.textDelta)
            }

            if(event.chunk.type === "reasoning"){
              console.log("----------------------reasoning", event.chunk.textDelta)
            }

          },
          onFinish: async ({ response, usage }) => {
            if (isAuthenticated && conversationId && session?.user?.id) {
              const responseTime = performance.now() - requestStartTime;

              const updatedMessages = appendResponseMessages({
                messages: allMessages,
                responseMessages: response.messages,
              });

              const assistantMessages = updatedMessages.filter(
                (msg) =>
                  msg.role === "assistant" &&
                  !allMessages.some((existing) => existing.id === msg.id)
              );

              if (assistantMessages.length > 0) {
                await saveChat({
                  id: conversationId,
                  messages: assistantMessages,
                  modelId,
                  userId: session.user.id,
                  responseTime,
                  usage,
                });
              }
            }
          },
        });

                      
 result.consumeStream()

            result.mergeIntoDataStream(dataStream, {
                sendReasoning: true
            });
      },
    });

    return new Response(
      await streamContext.resumableStream(streamId, () => stream)
    );
  } catch (error) {
    console.error("Chat API error:", error);

    const errorInfo = getErrorDisplayInfo(error);

    return new Response(
      JSON.stringify({
        error: errorInfo.type.toUpperCase(),
        message: errorInfo.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
