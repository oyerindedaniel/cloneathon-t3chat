export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  maxTokens: number;
  costPer1kTokens: {
    input: number;
    output: number;
  };
  capabilities: string[];
  recommended?: boolean;
  free?: boolean;
  supportsImages?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

export const AVAILABLE_MODELS: AIModel[] = [
  // Premium Models (Recommended but require credits)
  {
    id: "anthropic/claude-3.5-haiku",
    name: "Claude 3.5 Haiku",
    provider: "Anthropic",
    description: "Fast and efficient for everyday tasks",
    maxTokens: 8192,
    costPer1kTokens: {
      input: 0.0008,
      output: 0.004,
    },
    capabilities: ["Tool Usage"],
    disabled: true,
    disabledReason: "Requires credits - upgrade to use premium models",
  },
  {
    id: "anthropic/claude-3.7-sonnet",
    name: "Claude 3.7 Sonnet",
    provider: "Anthropic",
    description:
      "Hybrid reasoning model with instant or extended step-by-step thinking",
    maxTokens: 200000,
    costPer1kTokens: {
      input: 0.003,
      output: 0.015,
    },
    capabilities: ["Tool Usage", "Extended Thinking"],
    supportsImages: true,
    disabled: true,
  },
  {
    id: "anthropic/claude-3-7-sonnet-20250219:thinking",
    name: "Claude 3.7 Sonnet (Thinking)",
    provider: "Anthropic",
    description:
      "Hybrid reasoning model with instant or extended step-by-step thinking",
    maxTokens: 200000,
    costPer1kTokens: {
      input: 0.003,
      output: 0.015,
    },
    capabilities: ["Tool Usage", "Extended Thinking"],
    supportsImages: true,
    disabled: true,
  },
  {
    id: "anthropic/claude-opus-4",
    name: "Claude Opus 4",
    provider: "Anthropic",
    description:
      "World's best coding model with sustained performance on complex tasks",
    maxTokens: 200000,
    costPer1kTokens: {
      input: 0.015,
      output: 0.075,
    },
    capabilities: [],
    supportsImages: true,
    disabled: true,
  },
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4",
    provider: "Anthropic",
    description:
      "Enhanced coding and reasoning model with state-of-the-art performance",
    maxTokens: 200000,
    costPer1kTokens: {
      input: 0.003,
      output: 0.015,
    },
    capabilities: [],
    supportsImages: true,
    disabled: true,
  },
  {
    id: "openai/chatgpt-4o-latest",
    name: "GPT-4o",
    provider: "OpenAI",
    description: "Most advanced model with vision and reasoning capabilities",
    maxTokens: 4096,
    costPer1kTokens: {
      input: 0.005,
      output: 0.015,
    },
    capabilities: ["Image Input", "Tool Usage", "Tool Streaming"],
    recommended: true,
    supportsImages: true,
    disabled: true,
    disabledReason: "Requires credits - upgrade to use premium models",
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    description: "Faster and more cost-effective version of GPT-4o",
    maxTokens: 4096,
    costPer1kTokens: {
      input: 0.0015,
      output: 0.006,
    },
    capabilities: ["Image Input", "Tool Usage"],
    recommended: true,
    supportsImages: true,
    disabled: true,
    disabledReason: "Requires credits - upgrade to use premium models",
  },
  {
    id: "openai/codex-mini",
    name: "Codex Mini",
    provider: "OpenAI",
    description: "Fine-tuned version of o4-mini for Codex CLI",
    maxTokens: 200000,
    costPer1kTokens: {
      input: 0.0015,
      output: 0.006,
    },
    capabilities: [],
    disabled: true,
  },
  {
    id: "google/gemini-2.5-flash-preview-05-20",
    name: "Gemini 2.5 Flash Preview 05-20",
    provider: "Google",
    description:
      "State-of-the-art model for advanced reasoning and multimodal tasks",
    maxTokens: 1050000,
    costPer1kTokens: {
      input: 0.00015,
      output: 0.0006,
    },
    capabilities: ["Image Input", "Tool Usage"],
    supportsImages: true,
    disabled: true,
  },
  {
    id: "deepseek/deepseek-r1-0528",
    name: "DeepSeek R1 0528",
    provider: "DeepSeek",
    description: "Open-source model with performance on par with OpenAI o1",
    maxTokens: 131072,
    costPer1kTokens: {
      input: 0.0005,
      output: 0.00215,
    },
    capabilities: [],
    disabled: true,
  },

  // Free Models (Available without credits)
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Google: Gemini 2.0 Flash Experimental (free)",
    provider: "Google",
    description:
      "Gemini Flash 2.0 offers a significantly faster time to first token (TTFT) compared to Gemini Flash 1.5, while maintaining quality on par with larger models like Gemini Pro 1.5. It introduces notable enhancements in multimodal understanding, coding capabilities, complex instruction following, and function calling. These advancements come together to deliver more seamless and robust agentic experiences.",
    maxTokens: 1048576,
    costPer1kTokens: { input: 0, output: 0 },
    capabilities: ["Tool Usage", "Multimodal Understanding", "Code Generation"],
    free: true,
  },
  {
    id: "openai/gpt-oss-20b:free",
    name: "OpenAI: gpt-oss-20b (free)",
    provider: "OpenAI",
    description:
      "gpt-oss-20b is an open-weight 21B parameter model released by OpenAI under the Apache 2.0 license. It uses a Mixture-of-Experts (MoE) architecture with 3.6B active parameters per forward pass, optimized for lower-latency inference and deployability on consumer or single-GPU hardware. The model is trained in OpenAI’s Harmony response format and supports reasoning level configuration, fine-tuning, and agentic capabilities including function calling, tool use, and structured outputs.",
    maxTokens: 131072,
    costPer1kTokens: { input: 0, output: 0 },
    capabilities: [
      "Tool Usage",
      "Function Calling",
      "Structured Outputs",
      "Reasoning",
      "Fine-tuning",
      "Code Generation",
    ],
    free: true,
  },
];

export const DEFAULT_MODEL = AVAILABLE_MODELS.find((m) => m.free)!;

export const TITLE_GENERATION_MODEL =
  AVAILABLE_MODELS.find((m) => m.id === "google/gemini-2.0-flash-exp:free") ||
  DEFAULT_MODEL;

export function getModelById(id: string): AIModel | undefined {
  return AVAILABLE_MODELS.find((model) => model.id === id);
}

export function getRecommendedModels(): AIModel[] {
  return AVAILABLE_MODELS.filter((model) => model.recommended);
}

export function getFreeModels(): AIModel[] {
  return AVAILABLE_MODELS.filter((model) => model.free);
}

export function getPremiumModels(): AIModel[] {
  return AVAILABLE_MODELS.filter((model) => !model.free);
}

export function getModelsByProvider(provider: string): AIModel[] {
  return AVAILABLE_MODELS.filter((model) => model.provider === provider);
}

export function getAvailableModels(): AIModel[] {
  return AVAILABLE_MODELS.filter((model) => !model.disabled);
}

export function getModelsWithImages(): AIModel[] {
  return AVAILABLE_MODELS.filter((model) => model.supportsImages);
}

export const MODEL_CATEGORIES = {
  free: getFreeModels(),
  premium: getPremiumModels(),
  recommended: getRecommendedModels(),
  toolUsage: AVAILABLE_MODELS.filter((m) =>
    m.capabilities.includes("Tool Usage")
  ),
  powerful: [
    AVAILABLE_MODELS.find((m) => m.id === "openai/chatgpt-4o-latest")!,
    AVAILABLE_MODELS.find((m) => m.id === "anthropic/claude-opus-4")!,
  ].filter(Boolean),
  costEffective: AVAILABLE_MODELS.filter((m) => m.free),
  toolStreaming: AVAILABLE_MODELS.filter((m) =>
    m.capabilities.includes("Tool Streaming")
  ),
  vision: getModelsWithImages(),
  objectGeneration: AVAILABLE_MODELS.filter((m) =>
    m.capabilities.includes("Object Generation")
  ),
};
