import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { getSession } from "@/server/auth/session";
import { TITLE_GENERATION_MODEL } from "@/lib/ai/models";

export const maxDuration = 60;

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export async function POST(req: Request) {
  console.log("[GENERATE_TITLE] Starting title generation request");

  try {
    const session = await getSession();
    const isAuthenticated = !!session?.user;

    console.log("[GENERATE_TITLE] User authentication status:", {
      isAuthenticated,
      userId: session?.user?.id,
    });

    const { messages } = await req.json();
    console.log("[GENERATE_TITLE] Request payload:", {
      messagesCount: messages?.length,
      firstMessage: messages?.[0]?.content?.slice(0, 100) + "...",
    });

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error("[GENERATE_TITLE] Invalid messages payload");
      return new Response("Invalid messages", { status: 400 });
    }

    const contextMessages = messages.slice(0, 4);
    const conversationText = contextMessages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    console.log("[GENERATE_TITLE] Using model:", TITLE_GENERATION_MODEL.id);
    console.log("[GENERATE_TITLE] Context length:", conversationText.length);

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

    const generatedTitle = result.text.trim();
    console.log("[GENERATE_TITLE] Generated title:", generatedTitle);
    console.log("[GENERATE_TITLE] Title generation successful");

    return Response.json({ title: generatedTitle });
  } catch (error) {
    console.error("[GENERATE_TITLE] Title generation error:", {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new Response("Internal Server Error", { status: 500 });
  }
}
