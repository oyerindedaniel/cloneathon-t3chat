import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from "react";

export type SettingsSection = "settings" | "api-keys" | "shortcuts";

interface SettingsContextType {
  isOpen: boolean;
  section: SettingsSection;
  openSettings: (section?: SettingsSection) => void;
  closeSettings: () => void;
  setSection: (section: SettingsSection) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [section, setSectionState] = useState<SettingsSection>("settings");

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
            (sectionParam === "settings" ||
              sectionParam === "api-keys" ||
              sectionParam === "shortcuts")
          ) {
            setSectionState(sectionParam);
          }
        } else {
          setIsOpen(false);
          setSectionState("settings");
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
      setSectionState(targetSection);
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
    setSectionState("settings");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("settings");
      url.searchParams.delete("section");
      window.history.pushState({}, "", url.toString());
    }
  }, []);

  const setSection = useCallback(
    (newSection: SettingsSection) => {
      setSectionState(newSection);
      if (typeof window !== "undefined" && isOpen) {
        const url = new URL(window.location.href);
        url.searchParams.set("section", newSection);
        window.history.replaceState({}, "", url.toString());
      }
    },
    [isOpen]
  );

  return (
    <SettingsContext.Provider
      value={{
        isOpen,
        section,
        openSettings,
        closeSettings,
        setSection,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
