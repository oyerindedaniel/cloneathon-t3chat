import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChatContext } from "@/contexts/chat-context";
import { useSettings } from "@/contexts/settings-context";
import { useShallowSelector } from "react-shallow-store";

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  description: string;
  action: () => void;
  category: "chat" | "navigation" | "settings";
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { startNewConversationInstant } = useShallowSelector(
    ChatContext,
    (state) => ({
      startNewConversationInstant: state.startNewConversationInstant,
    })
  );

  const { openSettings } = useSettings();

  const shortcuts: KeyboardShortcut[] = [
    // Chat shortcuts
    {
      key: "o",
      ctrlKey: true,
      description: "New chat",
      category: "chat",
      action: () => {
        navigate("/conversations");
      },
    },
    {
      key: "n",
      ctrlKey: true,
      shiftKey: true,
      description: "New chat with message",
      category: "chat",
      action: () => {
        const message = prompt("Enter your message:");
        if (message?.trim()) {
          startNewConversationInstant(message.trim());
        }
      },
    },
    // Settings shortcuts
    {
      key: ",",
      ctrlKey: true,
      description: "Open settings",
      category: "settings",
      action: () => {
        openSettings("settings");
      },
    },
    {
      key: "k",
      ctrlKey: true,
      shiftKey: true,
      description: "API keys",
      category: "settings",
      action: () => {
        openSettings("api-keys");
      },
    },
    // Navigation shortcuts
    {
      key: "/",
      ctrlKey: true,
      description: "Search conversations",
      category: "navigation",
      action: () => {
        // Focus search input if available
        const searchInput = document.querySelector(
          "[data-search-input]"
        ) as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      },
    },
    {
      key: "Escape",
      description: "Close dialogs",
      category: "navigation",
      action: () => {
        // Close any open dialogs
        const closeButtons = document.querySelectorAll("[data-dialog-close]");
        closeButtons.forEach((button) => (button as HTMLElement).click());
      },
    },
  ];

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement)?.contentEditable === "true"
      ) {
        return;
      }

      const matchingShortcut = shortcuts.find((shortcut) => {
        const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase();
        const ctrlMatch =
          !!shortcut.ctrlKey === (event.ctrlKey || event.metaKey);
        const shiftMatch = !!shortcut.shiftKey === event.shiftKey;
        const altMatch = !!shortcut.altKey === event.altKey;

        return keyMatch && ctrlMatch && shiftMatch && altMatch;
      });

      if (matchingShortcut) {
        event.preventDefault();
        event.stopPropagation();
        matchingShortcut.action();
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const getShortcutDisplay = useCallback((shortcut: KeyboardShortcut) => {
    const parts: string[] = [];

    if (shortcut.ctrlKey || shortcut.metaKey) {
      parts.push(navigator.userAgent.includes("Mac") ? "⌘" : "Ctrl");
    }
    if (shortcut.shiftKey) {
      parts.push("⇧");
    }
    if (shortcut.altKey) {
      parts.push(navigator.userAgent.includes("Mac") ? "⌥" : "Alt");
    }

    let keyDisplay = shortcut.key;
    if (keyDisplay === " ") keyDisplay = "Space";
    if (keyDisplay === "Escape") keyDisplay = "Esc";
    if (keyDisplay === "ArrowUp") keyDisplay = "↑";
    if (keyDisplay === "ArrowDown") keyDisplay = "↓";
    if (keyDisplay === "ArrowLeft") keyDisplay = "←";
    if (keyDisplay === "ArrowRight") keyDisplay = "→";

    parts.push(keyDisplay.toUpperCase());

    return parts.join(" + ");
  }, []);

  return {
    shortcuts,
    getShortcutDisplay,
  };
}
