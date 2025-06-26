import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatHelpers, GetLocationResult } from "@/contexts/types";

interface LocationPermissionRequestProps {
  toolCallId: string;
  message: string;
  onConfirm: ChatHelpers["addToolResult"];
  onDeny: ChatHelpers["addToolResult"];
}

export const LocationPermissionRequest: React.FC<
  LocationPermissionRequestProps
> = ({ toolCallId, message, onConfirm, onDeny }) => {
  const handleConfirm = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const result: GetLocationResult = { latitude, longitude, timezone };
          onConfirm({
            toolCallId,
            result,
          });
        },
        (error) => {
          let errorMessage: "permission_denied" | "not_supported" =
            "not_supported";
          if (error.code === error.PERMISSION_DENIED) {
            errorMessage = "permission_denied";
          }
          const result: GetLocationResult = { error: errorMessage };
          onDeny({
            toolCallId,
            result,
          });
        }
      );
    } else {
      const result: GetLocationResult = { error: "not_supported" };
      onDeny({
        toolCallId,
        result,
      });
    }
  };

  const handleDeny = () => {
    const result: GetLocationResult = { error: "permission_denied" };
    onDeny({
      toolCallId,
      result,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-3xl bg-surface-primary border border-default shadow-md mt-2"
      )}
    >
      <div className="flex-1 text-foreground-default text-sm">{message}</div>
      <div className="flex flex-row gap-2 mt-2 md:mt-0">
        <Button variant="default" size="sm" onClick={handleConfirm} asChild>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1 bg-primary text-foreground-on-accent hover:bg-primary-hover active:bg-primary-active"
          >
            <Check className="size-4" /> Yes
          </motion.button>
        </Button>
        <Button variant="outline" size="sm" onClick={handleDeny} asChild>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1 border border-border-default bg-surface-primary text-foreground-default hover:bg-surface-hover"
          >
            <X className="size-4" /> No
          </motion.button>
        </Button>
      </div>
    </motion.div>
  );
};
