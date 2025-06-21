import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, MapPin, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GetLocationResult } from "@/contexts/chat-context";

interface LocationResultDisplayProps {
  result: GetLocationResult;
}

export const LocationResultDisplay: React.FC<LocationResultDisplayProps> = ({
  result,
}) => {
  const isError = "error" in result;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "p-4 rounded-lg shadow-sm mt-2 flex items-center gap-4",
        isError
          ? "bg-error text-foreground-on-accent"
          : "bg-surface-primary text-foreground-default"
      )}
    >
      <AnimatePresence mode="wait">
        {isError ? (
          <motion.div
            key="error-icon"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center size-8 rounded-full bg-foreground-on-accent/20"
          >
            <XCircle className="size-5 text-foreground-on-accent" />
          </motion.div>
        ) : (
          <motion.div
            key="success-icon"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center size-8 rounded-full bg-primary/20"
          >
            <CheckCircle className="size-5 text-primary" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1">
        <p className="font-semibold mb-1">
          {isError ? "Location Access Failed" : "Location Access Granted"}
        </p>

        {isError ? (
          <motion.p
            key="error-message"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.2 }}
            className="text-sm text-foreground-on-accent/90"
          >
            {result.error === "permission_denied"
              ? "Permission was denied by the user."
              : "Location access is not supported on this device or an unknown error occurred."}
          </motion.p>
        ) : (
          <motion.div
            key="location-details"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.2 }}
            className="text-sm space-y-1"
          >
            <p className="flex items-center gap-1">
              <MapPin className="size-3 text-foreground-subtle" />
              Latitude:{" "}
              <span className="font-medium">{result.latitude?.toFixed(2)}</span>
              , Longitude:{" "}
              <span className="font-medium">
                {result.longitude?.toFixed(2)}
              </span>
            </p>
            <p className="flex items-center gap-1">
              <Clock className="size-3 text-foreground-subtle" />
              Timezone: <span className="font-medium">{result.timezone}</span>
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
