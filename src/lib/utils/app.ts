export function getBaseUrl() {
  if (process.env.NODE_ENV === "development")
    return `http://localhost:${process.env.PORT ?? 3000}`;

  if (typeof window !== "undefined") return window.location.origin;

  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  return "http://localhost:3000";
}
