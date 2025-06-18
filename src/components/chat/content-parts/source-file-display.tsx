import React from "react";
import { motion } from "framer-motion";

interface SourceFileDisplayProps {
  type: "source" | "file";
  url?: string;
  title?: string;
  mimeType?: string;
  data?: string;
}

export const SourceFileDisplay: React.FC<SourceFileDisplayProps> = ({
  type,
  url,
  title,
  mimeType,
  data,
}) => {
  const displayUrl =
    type === "file" && mimeType && data
      ? `data:${mimeType};base64,${data}`
      : url;
  const displayText =
    type === "file" && mimeType ? `File (${mimeType})` : title || url || "Link";
  const downloadFileName =
    type === "file" && mimeType
      ? `file.${mimeType.split("/")[1] || "bin"}`
      : undefined;

  if (!displayUrl) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mt-2 text-xs text-foreground-muted bg-surface-primary p-3 rounded-md border border-border-default"
    >
      {type === "source" ? "Source" : "File"}:{" "}
      <a
        href={displayUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline"
        {...(downloadFileName ? { download: downloadFileName } : {})}
      >
        {displayText}
      </a>
    </motion.div>
  );
};
