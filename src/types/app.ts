import { API_KEY_PROVIDERS } from "@/lib/ai/providers";

export type APIKeyProvider = (typeof API_KEY_PROVIDERS)[number];
