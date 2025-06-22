import { tool } from "ai";
import { z } from "zod";
import { ToolCallUnion, ToolResultUnion } from "ai";

interface WebSearchResult {
  title: string;
  url: string;
  content?: string;
  score?: number;
  published_date?: string;
  raw_content?: string;
}

interface WebSearchImage {
  url: string;
  description?: string;
}

export interface WebSearchToolResult {
  success: boolean;
  answer?: string;
  results: WebSearchResult[];
  images: WebSearchImage[];
  query: string;
  response_time?: number;
  error?: string;
}

export const createWebSearchTool = (isWebSearchEnabled: boolean) =>
  tool({
    description:
      "Search the web for current information, news, and answers to questions",
    parameters: z.object({
      query: z.string().describe("The search query"),
      include_images: z
        .boolean()
        .default(true)
        .describe("Whether to include images in results"),
      max_results: z
        .number()
        .default(5)
        .describe("Maximum number of search results"),
    }),
    execute: async ({ query, include_images, max_results }) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
          },
          body: JSON.stringify({
            api_key: process.env.TAVILY_API_KEY,
            query,
            search_depth: "advanced",
            include_images,
            include_answer: true,
            include_raw_content: true,
            max_results,
            include_domains: [],
            exclude_domains: [],
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Tavily API error: ${response.statusText}`);
        }

        const data = (await response.json()) as { [key: string]: unknown };

        const result: WebSearchToolResult = {
          success: true,
          answer: typeof data.answer === "string" ? data.answer : undefined,
          results: Array.isArray(data.results)
            ? data.results.map((item: unknown) => {
                if (typeof item !== "object" || item === null)
                  return { title: "Unknown", url: "#" };
                const res = item as {
                  title?: string;
                  url?: string;
                  content?: string;
                  score?: number;
                  published_date?: string;
                  raw_content?: string;
                };
                return {
                  title: typeof res.title === "string" ? res.title : "No title",
                  url: typeof res.url === "string" ? res.url : "#",
                  content:
                    typeof res.content === "string" ? res.content : undefined,
                  score: typeof res.score === "number" ? res.score : undefined,
                  published_date:
                    typeof res.published_date === "string"
                      ? res.published_date
                      : undefined,
                  raw_content:
                    typeof res.raw_content === "string"
                      ? res.raw_content
                      : undefined,
                };
              })
            : [],
          images: Array.isArray(data.images)
            ? data.images.map((item: unknown) => {
                if (typeof item !== "object" || item === null)
                  return { url: "#" };
                const img = item as {
                  url?: string;
                  description?: string;
                  alt?: string;
                };
                return {
                  url: typeof img.url === "string" ? img.url : "#",
                  description:
                    typeof img.description === "string"
                      ? img.description
                      : typeof img.alt === "string"
                      ? img.alt
                      : undefined,
                };
              })
            : [],
          query: typeof data.query === "string" ? data.query : "",
          response_time:
            typeof data.response_time === "number"
              ? data.response_time
              : undefined,
        };
        return result;
      } catch (error: unknown) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
          console.error("Web search timed out:", error);
          return {
            success: false,
            error: "Web search request timed out after 60 seconds.",
            results: [],
            images: [],
            query,
          };
        } else if (error instanceof Error) {
          console.error("Web search error:", error);
          return {
            success: false,
            error: error.message,
            results: [],
            images: [],
            query,
          };
        } else {
          console.error("Web search unknown error:", error);
          return {
            success: false,
            error: "An unknown error occurred during web search.",
            results: [],
            images: [],
            query,
          };
        }
      }
    },
  });

export const getLocationTool = tool({
  description:
    "Ask the user for confirmation to get their location. Always ask for confirmation before using this tool.",
  parameters: z.object({
    message: z.string().describe("The confirmation message for the user."),
  }),
});

export const tools = {
  web_search: createWebSearchTool(false),
  get_location: getLocationTool,
};

export type AppToolCall = ToolCallUnion<typeof tools>;
export type AppToolResult = ToolResultUnion<typeof tools>;
