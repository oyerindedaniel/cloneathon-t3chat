import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ProxiedImage } from "./proxied-image";
import { AppToolResult } from "@/lib/ai/tools";

interface WebSearchResultsDisplayProps {
  query: string;
  results?: AppToolResult["result"]["results"];
  images?: AppToolResult["result"]["images"];
  loading: boolean;
  responseTime?: number;
}

export const WebSearchResultsDisplay: React.FC<
  WebSearchResultsDisplayProps
> = ({ query, results, images, loading, responseTime }) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (loading && !intervalRef.current) {
      intervalRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 100);
      }, 100);
    } else if (!loading && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [loading]);

  const formattedTime = responseTime
    ? (responseTime / 1000).toFixed(2)
    : (elapsedTime / 1000).toFixed(2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col gap-4 p-4 bg-surface-secondary rounded-lg shadow-sm"
    >
      <h3 className="text-lg font-semibold text-foreground-default flex items-center gap-2">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="searching-spinner"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2"
            >
              <div className="relative h-5 w-5">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.8, 0.4, 0.8],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 rounded-full bg-primary/50"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-3 w-3 rounded-full bg-primary animate-spin-slow" />
                </div>
              </div>
              <span className="text-primary">
                Searching the web for "{query}"
              </span>
            </motion.div>
          ) : (
            <motion.span
              key="results-title"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2"
            >
              <Globe className="h-5 w-5 text-primary" />
              Web Search Results for "{query}"
              {results && results.length > 0 && (
                <span className="ml-6 text-sm text-foreground-muted">
                  ({results.length} results)
                </span>
              )}
            </motion.span>
          )}
        </AnimatePresence>
        <motion.span
          layout
          className="ml-auto text-xs font-normal text-foreground-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          (Took {formattedTime}s)
        </motion.span>
      </h3>

      {loading && (
        <motion.p
          key="loading-subtitle"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="text-sm text-foreground-subtle"
        >
          Please wait while we search the web for you.
        </motion.p>
      )}

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading-shimmer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 gap-4"
          >
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-surface-primary border border-border-default rounded-md h-24 animate-pulse"
              />
            ))}
          </motion.div>
        ) : results && results.length > 0 ? (
          <motion.div
            key="results-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid gap-4"
          >
            {results.map((result, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.3,
                  ease: "easeOut",
                  delay: index * 0.05,
                }}
                className="bg-surface-primary border border-border-default rounded-md overflow-hidden transition-all duration-200 hover:shadow-md"
              >
                <div className="p-4">
                  <h4 className="text-md font-medium text-foreground-default line-clamp-1">
                    <Link
                      to={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:underline"
                    >
                      {result.title}
                      <ExternalLink className="h-3 w-3 text-foreground-muted" />
                    </Link>
                  </h4>
                  <p className="text-sm text-foreground-subtle line-clamp-2 mt-1">
                    {result.content || "No content available for this result."}
                  </p>
                  {result.published_date && (
                    <div className="inline-flex items-center rounded-3xl border border-border-subtle px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 mt-2 text-foreground-muted">
                      Published:{" "}
                      {new Date(result.published_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.p
            key="no-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-foreground-muted"
          >
            No search results found.
          </motion.p>
        )}
      </AnimatePresence>

      {images && images.length > 0 && (
        <motion.div
          key="images-content"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: loading ? 0.5 : 0 }}
          className="mt-4"
        >
          <h4 className="text-md font-medium text-foreground-default mb-2">
            Related Images:
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.3,
                  ease: "easeOut",
                  delay: index * 0.05,
                }}
                className="relative aspect-video rounded-md overflow-hidden bg-surface-tertiary flex items-center justify-center"
              >
                <ProxiedImage
                  src={image.url}
                  alt={image.description || `Image ${index + 1}`}
                  description={image.description}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
