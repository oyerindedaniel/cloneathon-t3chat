import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Info } from "lucide-react";
import { ToolCodeBlock } from "./tool-code-block";

interface UnknownToolDisplayProps {
  toolName: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: unknown;
}

export const UnknownToolDisplay: React.FC<UnknownToolDisplayProps> = ({
  toolName,
  toolInput,
  toolOutput,
}) => {
  const inputString =
    toolInput !== undefined ? JSON.stringify(toolInput, null, 2) : "";
  const outputString =
    toolOutput !== undefined ? JSON.stringify(toolOutput, null, 2) : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col gap-4 p-4 bg-surface-secondary rounded-lg shadow-sm border border-border-default"
    >
      <h3 className="text-lg font-semibold text-foreground-default flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-error-default" />
        Unknown Tool Detected:{" "}
        <span className="text-accent-primary">{toolName}</span>
      </h3>

      <p className="text-sm text-foreground-subtle">
        This tool's results could not be displayed as the tool is not recognized
        or its output format is unexpected.
      </p>

      {(inputString || outputString) && (
        <div className="flex flex-col gap-3">
          {inputString && (
            <ToolCodeBlock title="Tool Input" content={inputString} />
          )}
          {outputString && (
            <ToolCodeBlock title="Tool Output" content={outputString} />
          )}
        </div>
      )}
    </motion.div>
  );
};
