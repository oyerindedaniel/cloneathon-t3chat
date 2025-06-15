import { createResumableStreamContext } from "resumable-stream";
import { after } from "next/server";
import { publisher, subscriber } from "./redis";

// Create resumable stream context with Redis
export const streamContext = createResumableStreamContext({
  waitUntil: after,
  // Pass our Upstash Redis instances
  publisher,
  subscriber,
});

// Helper function to create a resumable stream for chat responses
export async function createResumableChatStream(
  streamId: string,
  sourceStreamFactory: () => ReadableStream<string>,
  resumeAt?: number
) {
  const stream = await streamContext.resumableStream(
    streamId,
    sourceStreamFactory,
    resumeAt
  );

  if (!stream) {
    throw new Error("Stream is already done or invalid");
  }

  return stream;
}

// Helper function to create a new resumable stream
export async function createNewResumableChatStream(
  streamId: string,
  sourceStreamFactory: () => ReadableStream<string>
) {
  const stream = await streamContext.createNewResumableStream(
    streamId,
    sourceStreamFactory
  );

  return stream;
}

// Helper function to resume an existing stream
export async function resumeExistingChatStream(
  streamId: string,
  resumeAt?: number
) {
  const stream = await streamContext.resumeExistingStream(streamId, resumeAt);

  if (!stream) {
    throw new Error("Stream not found or already completed");
  }

  return stream;
}
