import { APICallError, InvalidPromptError } from "ai";

export interface OpenRouterError {
  error: {
    code: number;
    message: string;
    metadata?: Record<string, unknown>;
  };
}

export interface ModerationErrorMetadata extends Record<string, unknown> {
  reasons: string[];
  flagged_input: string;
  provider_name: string;
  model_slug: string;
}

export interface ProviderErrorMetadata {
  provider_name: string;
  raw: unknown;
}

export interface OpenRouterKeyInfo {
  data: {
    label: string;
    usage: number;
    is_free_tier: boolean;
    is_provisioning_key: boolean;
    limit: number;
    limit_remaining: number;
  };
}

export function parseOpenRouterError(error: unknown): {
  type: "openrouter" | "network" | "unknown";
  code?: number;
  message: string;
  metadata?: Record<string, unknown>;
  title?: string;
} {
  console.log("Parsing error:--------------------------------------", error);

  // 1. Handle AI SDK APICallError
  if (APICallError.isInstance(error)) {
    if (error.responseBody && typeof error.responseBody === "string") {
      try {
        const parsedBody = JSON.parse(error.responseBody);
        if (
          parsedBody &&
          typeof parsedBody === "object" &&
          "error" in parsedBody &&
          typeof parsedBody.error === "object"
        ) {
          const openRouterError = parsedBody.error as {
            code?: number;
            message?: string;
            metadata?: Record<string, unknown>;
          };
          return {
            type: "openrouter",
            code: openRouterError.code || error.statusCode,
            message: openRouterError.message || "Unknown OpenRouter error",
            metadata: openRouterError.metadata,
          };
        }
      } catch (e) {
        // Fall through to other checks if responseBody isn't valid JSON or doesn't conform to expected error structure
      }
    }

    return {
      type: "network",
      code: error.statusCode,
      message:
        error.message || `API call failed with status ${error.statusCode}`,
    };
  }

  // 2. Handle AI SDK InvalidPromptError
  if (InvalidPromptError.isInstance(error)) {
    return {
      type: "unknown",
      title: "Invalid Prompt",
      message: error.message || "Invalid prompt provided.",
      metadata: {
        prompt: error.prompt,
        cause:
          error.cause instanceof Error
            ? error.cause.message
            : String(error.cause),
      },
    };
  }

  // 4. Handle generic HTTP response errors (e.g., from fetch without AI SDK wrapper)
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return {
      type: "network",
      code: error.statusCode,
      message: error.message,
    };
  }

  if (error instanceof Error) {
    return {
      type: "unknown",
      message: error.message,
    };
  }

  if (typeof error === "string") {
    return {
      type: "unknown",
      message: error,
    };
  }

  return {
    type: "unknown",
    message: "An unexpected error occurred",
  };
}

function isModerationErrorMetadata(
  metadata: Record<string, unknown>
): metadata is ModerationErrorMetadata {
  return (
    Array.isArray(metadata.reasons) &&
    typeof metadata.flagged_input === "string" &&
    typeof metadata.provider_name === "string" &&
    typeof metadata.model_slug === "string"
  );
}

export function getErrorDisplayInfo(error: unknown): {
  title: string;
  message: string;
  type: "error" | "warning" | "info";
  shouldOpenSettings?: boolean;
} {
  const parsed = parseOpenRouterError(error);

  console.log("parsed error-----------", parsed);

  if (parsed.type === "openrouter" && parsed.code) {
    switch (parsed.code) {
      case 400:
        return {
          title: "Invalid Request",
          message:
            "The request was invalid. Please check your input and try again.",
          type: "error",
        };

      case 401:
        return {
          title: "Authentication Error",
          message:
            "Invalid or missing API key. Please check your OpenRouter API key in settings.",
          type: "error",
          shouldOpenSettings: true,
        };

      case 402:
        return {
          title: "Insufficient Credits",
          message:
            "Your account or API key has insufficient credits. Please add more credits to your OpenRouter account.",
          type: "warning",
        };

      case 403:
        if (parsed.metadata && isModerationErrorMetadata(parsed.metadata)) {
          return {
            title: "Content Moderation",
            message: `Your input was flagged for: ${parsed.metadata.reasons.join(
              ", "
            )}. Please modify your request.`,
            type: "warning",
          };
        }
        return {
          title: "Access Denied",
          message:
            "Your API key doesn't have access to this model or your input was flagged.",
          type: "warning",
        };

      case 408:
        return {
          title: "Request Timeout",
          message: "Your request timed out. Please try again.",
          type: "warning",
        };

      case 429:
        return {
          title: "Rate Limited",
          message:
            "You are being rate limited. Please wait a moment and try again.",
          type: "warning",
        };

      case 502:
        return {
          title: "Model Unavailable",
          message:
            "The selected model is currently down or unavailable. Please try a different model.",
          type: "error",
        };

      case 503:
        return {
          title: "No Available Provider",
          message:
            "No model provider is available that meets your requirements. Please try again later.",
          type: "error",
        };

      default:
        return {
          title: "API Error",
          message:
            parsed.message || "An error occurred with the OpenRouter API.",
          type: "error",
        };
    }
  }

  return {
    title: "Error",
    message: parsed.message,
    type: "error",
  };
}
