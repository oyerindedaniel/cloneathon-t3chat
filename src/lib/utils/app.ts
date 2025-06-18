export function getBaseUrl() {
  if (process.env.NODE_ENV === "development")
    return `http://localhost:${process.env.PORT ?? 3000}`;

  if (typeof window !== "undefined") return window.location.origin;

  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  return "http://localhost:3000";
}

export function tryParseJson<T = unknown>(input: unknown): T | undefined {
  if (typeof input !== "string") {
    return input ? (input as T) : undefined;
  }

  try {
    return JSON.parse(input) as T;
  } catch {
    return undefined;
  }
}

export function tryStringifyJson(input: unknown): string | undefined {
  if (typeof input === "string") return input;

  try {
    return JSON.stringify(input);
  } catch {
    return undefined;
  }
}
