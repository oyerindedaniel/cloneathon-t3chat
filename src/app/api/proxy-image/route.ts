import { NextRequest, NextResponse } from "next/server";

const ALLOWED_DOMAINS = [
  "images.unsplash.com",
  "cdn.pixabay.com",
  "images.pexels.com",
  "upload.wikimedia.org",
  "i.imgur.com",
  "media.giphy.com",
  "avatars.githubusercontent.com",
  "lh3.googleusercontent.com",
  "bing.com",
  "googleapis.com",
];

const BLOCKED_EXTENSIONS = [".exe", ".zip", ".rar", ".dmg", ".pkg"];

function isValidImageUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);

    // Checks if domain is allowed (optional - remove if you want to proxy any image)
    // const domain = parsedUrl.hostname.toLowerCase();
    // if (!ALLOWED_DOMAINS.some(allowed => domain.includes(allowed))) {
    //   return false;
    // }

    const path = parsedUrl.pathname.toLowerCase();
    if (BLOCKED_EXTENSIONS.some((ext) => path.endsWith(ext))) {
      return false;
    }

    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const imageUrl = searchParams.get("url");

    if (!imageUrl) {
      return new NextResponse("Missing image URL", { status: 400 });
    }

    if (!isValidImageUrl(imageUrl)) {
      return new NextResponse("Invalid or unsafe image URL", { status: 400 });
    }

    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AI-Chat-Bot/1.0)",
        Accept: "image/webp,image/avif,image/apng,image/*,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
      },

      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return new NextResponse(`Failed to fetch image: ${response.status}`, {
        status: response.status,
      });
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.startsWith("image/")) {
      return new NextResponse("URL does not point to an image", {
        status: 400,
      });
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      return new NextResponse("Image too large", { status: 413 });
    }

    const imageBuffer = await response.arrayBuffer();

    const headers = new Headers({
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Content-Length": imageBuffer.byteLength.toString(),
    });

    const headersToProxy = ["last-modified", "etag", "expires"];
    headersToProxy.forEach((header) => {
      const value = response.headers.get(header);
      if (value) {
        headers.set(header, value);
      }
    });

    return new NextResponse(imageBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Image proxy error:", error);

    if (error instanceof Error) {
      if (error.name === "TimeoutError") {
        return new NextResponse("Request timeout", { status: 408 });
      }
      if (error.message.includes("fetch")) {
        return new NextResponse("Failed to fetch image", { status: 502 });
      }
    }

    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
