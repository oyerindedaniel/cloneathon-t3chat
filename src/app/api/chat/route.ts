import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, convertToCoreMessages } from "ai";
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

export const maxDuration = 60;

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

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

    let conversation = null;
    if (conversationId) {
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
    }

    const allMessages = conversation
      ? await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conversationId))
          .orderBy(asc(messages.sequenceNumber))
      : [];

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
      onError({ error }) {
        console.error("Streaming error:", error);
      },
      onFinish: async ({ text, usage, finishReason, response }) => {
        try {
          if (conversationId) {
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
          }
        } catch (error) {
          console.error("Error saving messages:", error);
        }
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
