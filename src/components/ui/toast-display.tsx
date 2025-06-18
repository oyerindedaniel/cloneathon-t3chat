"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ToastDisplay() {
  const { toast, resetTimer } = useToast();

  return (
    <AnimatePresence>
      {toast.isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-4 right-4 z-[9999]"
          onMouseEnter={() => resetTimer()}
          onMouseLeave={() => resetTimer()}
        >
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border cursor-pointer",
              toast.type === "success" &&
                "bg-success/50 border-success/20 text-white",
              toast.type === "error" &&
                "bg-error/50 border-error/20 text-white",
              toast.type === "info" && "bg-info/50 border-info/20 text-white"
            )}
          >
            {toast.type === "success" && <CheckCircle className="w-4 h-4" />}
            {toast.type === "error" && <AlertCircle className="w-4 h-4" />}
            {toast.type === "info" && <AlertCircle className="w-4 h-4" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
