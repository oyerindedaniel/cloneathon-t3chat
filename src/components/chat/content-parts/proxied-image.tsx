import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";

interface ProxiedImageProps {
  src: string;
  alt: string;
  description?: string;
  className?: string;
}

export const ProxiedImage: React.FC<ProxiedImageProps> = ({
  src,
  alt,
  description,
  className,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(src)}`;

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div
      className={`relative aspect-video rounded-md overflow-hidden bg-surface-tertiary flex items-center justify-center ${className}`}
    >
      <AnimatePresence mode="wait">
        {isLoading && !hasError && (
          <motion.div
            key="loading-shimmer"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              backgroundPosition: ["-200%", "200%"],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 1.5,
              ease: "linear",
              repeat: Infinity,
            }}
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, var(--surface-tertiary) 0%, var(--color-primary-active) 20%, var(--surface-tertiary) 40%)`,
              backgroundSize: "200% 100%",
            }}
          />
        )}

        {hasError ? (
          <motion.div
            key="error-state"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center text-foreground-on-accent p-4 bg-error rounded-md text-center w-full h-full"
          >
            <AlertCircle className="w-8 h-8 mb-2" />
            <p className="text-sm font-semibold">Image Failed to Load</p>
            <p className="text-xs text-foreground-on-accent/80">
              Try refreshing or check source.
            </p>
          </motion.div>
        ) : (
          <img
            key="image-content"
            src={proxyUrl}
            alt={alt}
            onLoad={handleLoad}
            onError={handleError}
            className="w-full h-full object-cover"
            loading="lazy"
            style={{ display: isLoading ? "none" : "block" }}
          />
        )}
      </AnimatePresence>

      {description && (
        <AnimatePresence>
          {!isLoading && !hasError && (
            <motion.div
              key="description-overlay"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary/70 to-transparent p-2 text-foreground-on-accent text-xs line-clamp-2"
            >
              {description}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};
