import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

export function KeyboardShortcuts() {
  // This component just initializes the keyboard shortcuts hook
  // The actual shortcuts are handled globally by the hook
  useKeyboardShortcuts();

  return null;
}
