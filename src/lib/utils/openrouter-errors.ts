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
} {
  console.log("Parsing error:--------------------------------------", error);

  // Handle OpenRouter API errors
  if (typeof error === "object" && error !== null) {
    const errorObj = error as any;

    // Check for AI SDK wrapped errors with responseBody
    if (errorObj.responseBody && typeof errorObj.responseBody === "string") {
      try {
        const parsedBody = JSON.parse(errorObj.responseBody);
        if (parsedBody.error && typeof parsedBody.error === "object") {
          return {
            type: "openrouter",
            code: parsedBody.error.code || errorObj.statusCode,
            message: parsedBody.error.message || "Unknown OpenRouter error",
            metadata: parsedBody.error.metadata,
          };
        }
      } catch (e) {
        // Fall through to other checks
      }
    }

    // Check for direct OpenRouter error format
    if (errorObj.error && typeof errorObj.error === "object") {
      const openRouterError = errorObj.error;
      return {
        type: "openrouter",
        code: openRouterError.code,
        message: openRouterError.message || "Unknown OpenRouter error",
        metadata: openRouterError.metadata,
      };
    }

    // Check for HTTP response errors
    if (errorObj.statusCode && errorObj.message) {
      return {
        type: "network",
        code: errorObj.statusCode,
        message: errorObj.message,
      };
    }

    // Check for Error objects
    if (errorObj.message) {
      return {
        type: "unknown",
        message: errorObj.message,
      };
    }
  }

  // Handle string errors
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
