import { useState, useEffect, useCallback } from "react";

export type SettingsSection = "settings" | "api-keys";

interface UseSettingsDialogReturn {
  isOpen: boolean;
  section: SettingsSection;
  openSettings: (section?: SettingsSection) => void;
  closeSettings: () => void;
  setSection: (section: SettingsSection) => void;
}

export function useSettingsDialog(): UseSettingsDialogReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [section, setSection] = useState<SettingsSection>("settings");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleUrlChange = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const settingsParam = urlParams.get("settings");
      const sectionParam = urlParams.get("section") as SettingsSection;

      requestAnimationFrame(() => {
        if (settingsParam === "open") {
          setIsOpen(true);
          if (
            sectionParam &&
            (sectionParam === "settings" || sectionParam === "api-keys")
          ) {
            setSection(sectionParam);
          }
        } else {
          setIsOpen(false);
        }
      });
    };

    handleUrlChange();

    window.addEventListener("popstate", handleUrlChange);

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      originalPushState.apply(window.history, args);
      handleUrlChange();
    };

    window.history.replaceState = function (...args) {
      originalReplaceState.apply(window.history, args);
      handleUrlChange();
    };

    return () => {
      window.removeEventListener("popstate", handleUrlChange);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  const openSettings = useCallback(
    (targetSection: SettingsSection = "settings") => {
      setIsOpen(true);
      setSection(targetSection);

      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("settings", "open");
        url.searchParams.set("section", targetSection);
        window.history.pushState({}, "", url.toString());
      }
    },
    []
  );

  const closeSettings = useCallback(() => {
    setIsOpen(false);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("settings");
      url.searchParams.delete("section");
      window.history.pushState({}, "", url.toString());
    }
  }, []);

  const handleSetSection = useCallback(
    (newSection: SettingsSection) => {
      setSection(newSection);

      if (typeof window !== "undefined" && isOpen) {
        const url = new URL(window.location.href);
        url.searchParams.set("section", newSection);
        window.history.replaceState({}, "", url.toString());
      }
    },
    [isOpen]
  );

  return {
    isOpen,
    section,
    openSettings,
    closeSettings,
    setSection: handleSetSection,
  };
}
