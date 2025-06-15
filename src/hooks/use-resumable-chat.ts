import { useState, useCallback, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

interface UseResumableChatOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
  onConnectionLost?: () => void;
  onConnectionRestored?: () => void;
  autoResumeOnError?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export function useResumableChat(options: UseResumableChatOptions = {}) {
  const {
    onChunk,
    onComplete,
    onError,
    onConnectionLost,
    onConnectionRestored,
    autoResumeOnError = true,
    maxRetries = 3,
    retryDelay = 1000,
  } = options;

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [receivedChunks, setReceivedChunks] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(
    null
  );

  // Start a new resumable chat stream
  const startStream = useCallback(
    async (
      messages: ChatMessage[],
      modelId: string,
      userLocation?: any,
      conversationId?: string
    ) => {
      try {
        setIsStreaming(true);
        setError(null);
        setReceivedChunks([]);
        setRetryCount(0);

        const newStreamId = conversationId || uuidv4();
        setStreamId(newStreamId);

        // Create new resumable stream using POST
        const response = await fetch(`/api/streams/${newStreamId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages,
            modelId,
            userLocation,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to start stream");
        }

        await processStream(response, newStreamId);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        onError?.(errorMessage);
        setIsStreaming(false);

        if (autoResumeOnError && retryCount < maxRetries) {
          setTimeout(() => {
            resumeStream();
          }, retryDelay);
        }
      }
    },
    [onError, autoResumeOnError, retryCount, maxRetries, retryDelay]
  );

  // Resume an existing stream
  const resumeStream = useCallback(async () => {
    if (!streamId) {
      setError("No stream ID available for resumption");
      return;
    }

    try {
      setError(null);
      onConnectionRestored?.();

      // Use GET with query parameters for resumption
      const response = await fetch(
        `/api/streams/${streamId}?resumeAt=${receivedChunks.length}`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        if (response.status === 422) {
          // Stream is already done
          setIsStreaming(false);
          onComplete?.();
          return;
        }
        throw new Error("Failed to resume stream");
      }

      await processStream(response, streamId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      onError?.(errorMessage);

      if (retryCount < maxRetries) {
        setRetryCount((prev) => prev + 1);
        setTimeout(() => {
          resumeStream();
        }, retryDelay * Math.pow(2, retryCount)); // Exponential backoff
      } else {
        setIsStreaming(false);
      }
    }
  }, [
    streamId,
    receivedChunks.length,
    onConnectionRestored,
    onComplete,
    onError,
    retryCount,
    maxRetries,
    retryDelay,
  ]);

  // Process the stream response
  const processStream = useCallback(
    async (response: Response, currentStreamId: string) => {
      if (!response.body) {
        throw new Error("No response body");
      }

      abortControllerRef.current = new AbortController();
      const reader = response.body.getReader();
      readerRef.current = reader;

      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            setIsStreaming(false);
            onComplete?.();
            break;
          }

          if (value) {
            const chunk = decoder.decode(value, { stream: true });

            setReceivedChunks((prev) => [...prev, chunk]);
            onChunk?.(chunk);
            setRetryCount(0); // Reset retry count on successful chunk
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // Stream was intentionally aborted
          return;
        }

        // Connection lost
        onConnectionLost?.();

        if (autoResumeOnError && retryCount < maxRetries) {
          setTimeout(() => {
            resumeStream();
          }, retryDelay);
        } else {
          const errorMessage = err instanceof Error ? err.message : String(err);
          setError(errorMessage);
          onError?.(errorMessage);
          setIsStreaming(false);
        }
      } finally {
        readerRef.current = null;
      }
    },
    [
      onChunk,
      onComplete,
      onConnectionLost,
      onError,
      autoResumeOnError,
      retryCount,
      maxRetries,
      retryDelay,
      resumeStream,
    ]
  );

  // Stop the current stream
  const stopStream = useCallback(() => {
    abortControllerRef.current?.abort();
    readerRef.current?.cancel();
    setIsStreaming(false);
    setStreamId(null);
    setReceivedChunks([]);
    setError(null);
    setRetryCount(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {
    isStreaming,
    streamId,
    receivedChunks,
    error,
    retryCount,
    startStream,
    resumeStream,
    stopStream,
    // Computed values
    totalChunks: receivedChunks.length,
    fullContent: receivedChunks.join(""),
  };
}
