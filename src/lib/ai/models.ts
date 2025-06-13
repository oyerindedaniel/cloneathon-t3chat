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
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    description: "Most advanced model with vision and reasoning capabilities",
    maxTokens: 4096,
    costPer1kTokens: { input: 0.005, output: 0.015 },
    capabilities: ["Text", "Vision", "Code", "Reasoning", "Function calling"],
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
    costPer1kTokens: { input: 0.0015, output: 0.006 },
    capabilities: ["Text", "Vision", "Code", "Fast responses"],
    recommended: true,
    supportsImages: true,
    disabled: true,
    disabledReason: "Requires credits - upgrade to use premium models",
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    description: "Excellent for analysis, coding, and creative tasks",
    maxTokens: 8192,
    costPer1kTokens: { input: 0.003, output: 0.015 },
    capabilities: [
      "Text",
      "Code",
      "Analysis",
      "Creative writing",
      "Long context",
    ],
    disabled: true,
    disabledReason: "Requires credits - upgrade to use premium models",
  },
  {
    id: "anthropic/claude-3.5-haiku",
    name: "Claude 3.5 Haiku",
    provider: "Anthropic",
    description: "Fast and efficient for everyday tasks",
    maxTokens: 8192,
    costPer1kTokens: { input: 0.0008, output: 0.004 },
    capabilities: ["Text", "Fast responses", "Cost-effective"],
    disabled: true,
    disabledReason: "Requires credits - upgrade to use premium models",
  },
  {
    id: "google/gemini-pro",
    name: "Gemini Pro",
    provider: "Google",
    description: "Google's advanced AI with multimodal understanding",
    maxTokens: 2048,
    costPer1kTokens: { input: 0.0005, output: 0.0015 },
    capabilities: ["Text", "Vision", "Code", "Multimodal"],
    supportsImages: true,
    disabled: true,
    disabledReason: "Requires credits - upgrade to use premium models",
  },

  // Free Models (Available without credits)
  {
    id: "meta-llama/llama-3.1-8b-instruct:free",
    name: "Llama 3.1 8B (Free)",
    provider: "Meta",
    description: "Free open-source model, great for general tasks",
    maxTokens: 8192,
    costPer1kTokens: { input: 0, output: 0 },
    capabilities: ["Text", "Code", "Open source", "Free"],
    free: true,
    recommended: true,
  },
  {
    id: "microsoft/phi-3-mini-128k-instruct:free",
    name: "Phi-3 Mini (Free)",
    provider: "Microsoft",
    description: "Compact and efficient model for everyday conversations",
    maxTokens: 128000,
    costPer1kTokens: { input: 0, output: 0 },
    capabilities: ["Text", "Fast responses", "Long context", "Free"],
    free: true,
  },
  {
    id: "google/gemma-2-9b-it:free",
    name: "Gemma 2 9B (Free)",
    provider: "Google",
    description: "Google's open model with strong performance",
    maxTokens: 8192,
    costPer1kTokens: { input: 0, output: 0 },
    capabilities: ["Text", "Code", "Open source", "Free"],
    free: true,
  },
  {
    id: "qwen/qwen-2-7b-instruct:free",
    name: "Qwen 2 7B (Free)",
    provider: "Alibaba",
    description: "Multilingual model with coding capabilities",
    maxTokens: 32768,
    costPer1kTokens: { input: 0, output: 0 },
    capabilities: ["Text", "Code", "Multilingual", "Long context", "Free"],
    free: true,
  },
  {
    id: "huggingface/zephyr-7b-beta:free",
    name: "Zephyr 7B (Free)",
    provider: "Hugging Face",
    description: "Fine-tuned for helpful, harmless conversations",
    maxTokens: 4096,
    costPer1kTokens: { input: 0, output: 0 },
    capabilities: ["Text", "Conversational", "Free"],
    free: true,
  },

  {
    id: "meta-llama/llama-3.1-70b-instruct",
    name: "Llama 3.1 70B",
    provider: "Meta",
    description: "Large open-source model with strong performance",
    maxTokens: 4096,
    costPer1kTokens: { input: 0.0009, output: 0.0009 },
    capabilities: ["Text", "Code", "Open source", "Cost-effective"],
    disabled: true,
    disabledReason: "Requires credits - upgrade to use premium models",
  },
];

export const DEFAULT_MODEL = AVAILABLE_MODELS.find(
  (m) => m.id === "meta-llama/llama-3.1-8b-instruct:free"
)!;

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
  fast: AVAILABLE_MODELS.filter((m) =>
    m.capabilities.includes("Fast responses")
  ),
  powerful: [
    AVAILABLE_MODELS.find((m) => m.id === "openai/gpt-4o")!,
    AVAILABLE_MODELS.find((m) => m.id === "anthropic/claude-3.5-sonnet")!,
  ].filter(Boolean),
  costEffective: AVAILABLE_MODELS.filter(
    (m) => m.capabilities.includes("Cost-effective") || m.free
  ),
  coding: AVAILABLE_MODELS.filter((m) => m.capabilities.includes("Code")),
  vision: getModelsWithImages(),
  longContext: AVAILABLE_MODELS.filter((m) =>
    m.capabilities.includes("Long context")
  ),
};
