import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Message } from "ai";
import { TITLE_GENERATION_MODEL } from "@/lib/ai/models";

export const maxDuration = 30;

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { messages } = (await req.json()) as { messages: Message[] };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response("Invalid messages", { status: 400 });
    }

    const contextMessages = messages.slice(0, 4);
    const conversationText = contextMessages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    const result = await generateText({
      model: openrouter.chat(TITLE_GENERATION_MODEL.id),
      messages: [
        {
          role: "system",
          content: `Generate a concise, descriptive title (3-6 words) for this conversation. The title should capture the main topic or question being discussed. Do not use quotes or special formatting. Just return the plain title text.`,
        },
        {
          role: "user",
          content: `Conversation:\n${conversationText}\n\nGenerate a title:`,
        },
      ],
      temperature: 0.3,
      maxTokens: 20,
    });

    return new Response(result.text, {
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error) {
    console.error("[GENERATE_TITLE] Title generation error:", {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new Response("Internal Server Error", { status: 500 });
  }
}
