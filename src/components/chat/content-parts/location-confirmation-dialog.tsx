import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ToolCall } from "ai";

interface LocationConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  toolCall: ToolCall<"getLocation", { message: string }> | null;
  onConfirm: (toolCallId: string, result: string) => void;
  onDeny: (toolCallId: string, result: string) => void;
}

export const LocationConfirmationDialog: React.FC<
  LocationConfirmationDialogProps
> = ({ isOpen, onClose, toolCall, onConfirm, onDeny }) => {
  if (!toolCall) return null;

  const message =
    toolCall.args.message ||
    "The AI wants to access your location. Do you approve?";

  const handleConfirm = () => {
    if (toolCall) {
      onConfirm(toolCall.toolCallId, "Location access granted.");
    }
    onClose();
  };

  const handleDeny = () => {
    if (toolCall) {
      onDeny(toolCall.toolCallId, "Location access denied by user.");
    }
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md auth-animate-in">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-semibold text-foreground-default">
            Confirm Location Access
          </AlertDialogTitle>
          <AlertDialogDescription className="text-foreground-subtle mt-2">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4">
          <AlertDialogCancel
            onClick={handleDeny}
            className="mt-2 sm:mt-0 px-4 py-2 rounded-md border border-border-default text-foreground-default hover:bg-surface-hover transition-colors"
          >
            Deny
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="px-4 py-2 rounded-md bg-primary text-foreground-on-accent hover:bg-primary-hover transition-colors"
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
