import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, convertToCoreMessages, smoothStream } from "ai";
import { getSession } from "@/server/auth/session";
import { db } from "@/server/db";
import {
  conversations,
  messages,
  type NewConversation,
} from "@/server/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import {
  generateSystemMessage,
  detectConversationContext,
} from "@/lib/ai/system-message";
import type { Message } from "ai";
import { cookies } from "next/headers";
import { getErrorDisplayInfo } from "@/lib/utils/openrouter-errors";

export const maxDuration = 60;

const REASONING_MODELS = [
  "deepseek/deepseek-r1",
  "deepseek/deepseek-r1:free",
  "deepseek/deepseek-r1-distill-llama-70b",
  "microsoft/phi-4-reasoning-plus:free",
  "anthropic/claude-3.7-sonnet",
  "google/gemini-flash-thinking-exp",
  "openai/o1-preview",
  "openai/o1-mini",
  "x-ai/grok-2-reasoning-beta",
];

function supportsReasoning(modelId: string): boolean {
  return REASONING_MODELS.some((model) =>
    modelId.includes(model.split("/")[1])
  );
}

async function getApiKey(): Promise<string> {
  const cookieStore = await cookies();
  const userApiKey = cookieStore.get("apikey_openrouter");

  return userApiKey?.value || process.env.OPENROUTER_API_KEY!;
}

function errorHandler(error: unknown): string {
  console.log("Error handler called with:", error);

  const errorInfo = getErrorDisplayInfo(error);

  return JSON.stringify({
    type: errorInfo.type,
    title: errorInfo.title,
    message: errorInfo.message,
    shouldOpenSettings: errorInfo.shouldOpenSettings,
  });
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const isAuthenticated = !!session?.user;

    const {
      messages: inputMessages,
      conversationId,
      modelId,
      userLocation,
    } = await req.json();

    if (!inputMessages || !Array.isArray(inputMessages)) {
      return new Response("Invalid messages", { status: 400 });
    }

    if (!modelId) {
      return new Response("Model ID is required", { status: 400 });
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

    let conversation = null;
    let allMessages: Message[] = [];

    if (isAuthenticated && conversationId) {
      const conversationData = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (
        conversationData[0] &&
        conversationData[0].userId === session.user.id
      ) {
        conversation = conversationData[0];
      } else if (
        conversationData[0] &&
        conversationData[0].userId !== session.user.id
      ) {
        return new Response("Conversation not found", { status: 404 });
      } else {
        try {
          const firstUserMessage = inputMessages.find(
            (msg) => msg.role === "user"
          );
          const title =
            firstUserMessage?.content?.slice(0, 50) +
              (firstUserMessage?.content?.length > 50 ? "..." : "") ||
            "New Chat";

          const newConversation = await db
            .insert(conversations)
            .values({
              id: conversationId,
              title,
              model: modelId,
              temperature: 0.7,
              maxTokens: 4000,
              userId: session.user.id,
            })
            .returning();

          conversation = newConversation[0];
        } catch (error) {
          console.error("Failed to create conversation on-the-fly:", error);
        }
      }

      if (conversation) {
        allMessages = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conversationId))
          .orderBy(asc(messages.sequenceNumber));
      }
    }

    const conversationContext = detectConversationContext([
      ...allMessages.map((msg) => ({
        content: msg.content,
        role: msg.role as "user" | "assistant" | "system",
      })),
      ...inputMessages,
    ]);

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
      ...inputMessages,
    ]);

    const result = streamText({
      model: openrouter.chat(modelId),
      messages: coreMessages,
      temperature: conversation?.temperature ?? 0.7,
      maxTokens: conversation?.maxTokens ?? 1000,
      experimental_transform: smoothStream(),
      ...(supportsReasoning(modelId) && {
        reasoning: {
          effort: "high",
          exclude: false,
        },
      }),
      onError({ error }) {
        const errorInfo = getErrorDisplayInfo(error);

        console.error("Streaming error:", errorInfo.title, errorInfo.message);
      },
      onFinish: async ({ text, usage, finishReason, response }) => {
        if (!isAuthenticated || !conversationId) {
          return;
        }

        try {
          const lastMessage = await db
            .select({ sequenceNumber: messages.sequenceNumber })
            .from(messages)
            .where(eq(messages.conversationId, conversationId))
            .orderBy(desc(messages.sequenceNumber))
            .limit(1);

          const nextSequence = (lastMessage[0]?.sequenceNumber ?? 0) + 1;

          const userMessage = inputMessages[inputMessages.length - 1];
          if (userMessage && userMessage.role === "user") {
            await db.insert(messages).values({
              conversationId,
              role: "user",
              content: userMessage.content,
              sequenceNumber: nextSequence,
              metadata: {
                timestamp: new Date(),
                model: modelId,
              },
            });
          }

          await db.insert(messages).values({
            conversationId,
            role: "assistant",
            content: text,
            sequenceNumber: nextSequence + 1,
            metadata: {
              timestamp: new Date(),
              model: modelId,
              usage,
              finishReason,
              responseId: response.id,
            },
          });

          const updateData: Partial<NewConversation> = {
            updatedAt: new Date(),
            lastMessageAt: new Date(),
          };

          if (conversation && conversation.model !== modelId) {
            updateData.model = modelId;
          }

          await db
            .update(conversations)
            .set(updateData)
            .where(eq(conversations.id, conversationId));
        } catch (error) {
          console.error("Error saving messages:", error);
        }
      },
    });

    return result.toDataStreamResponse({
      getErrorMessage: errorHandler,
    });
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
