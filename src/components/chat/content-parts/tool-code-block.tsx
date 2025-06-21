import React from "react";
import { motion } from "framer-motion";

interface ToolCodeBlockProps {
  title: string;
  content: string;
}

export const ToolCodeBlock: React.FC<ToolCodeBlockProps> = ({
  title,
  content,
}) => {
  if (!content) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="bg-surface-primary p-3 rounded-md text-sm text-foreground-code overflow-x-auto border border-border-default"
    >
      <h4 className="font-medium text-foreground-default mb-1">{title}:</h4>
      <pre className="whitespace-pre-wrap break-all">{content}</pre>
    </motion.div>
  );
};
