"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  Key,
  User,
  LogOut,
  Eye,
  EyeOff,
  Copy,
  Check,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Keyboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useClipboard } from "@/hooks/use-clipboard";
import { useToast } from "@/hooks/use-toast";
import { AVAILABLE_MODELS } from "@/lib/ai/models";
import { api } from "@/trpc/react";
import { ApiKeyStats } from "@/components/api-key-stats";
import { ShortcutBadge } from "@/components/ui/shortcut-badge";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useChatConfig } from "@/contexts/chat-context";
import { useSettings } from "@/contexts/settings-context";

export function SettingsDialog() {
  const [newApiKey, setNewApiKey] = useState("");
  const [hiddenKey, setHiddenKey] = useState(true);

  const { user, signOut } = useAuth();
  const { copied, copy } = useClipboard();
  const { showToast } = useToast();
  const { shortcuts, getShortcutDisplay } = useKeyboardShortcuts();

  const { selectedModel } = useChatConfig();
  const { isOpen, section, closeSettings, setSection } = useSettings();

  const utils = api.useUtils();

  const queryOptions = {
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  } as const;

  const { data: currentApiKey } = api.apiKeys.getApiKey.useQuery(
    { provider: "openrouter" },
    {
      ...queryOptions,
    }
  );

  const hasApiKey = !!currentApiKey?.key;

  const setApiKeyMutation = api.apiKeys.setApiKey.useMutation({
    onSuccess: async () => {
      await utils.apiKeys.invalidate();
      await utils.apiKeys.getApiKeyInfo.invalidate();

      showToast("API key added successfully!", "success");
      setNewApiKey("");
    },
    onError: (error) => {
      console.error("Failed to set API key:", error);
      showToast("Failed to add API key. Please try again.", "error");
    },
  });

  const removeApiKeyMutation = api.apiKeys.removeApiKey.useMutation({
    onSuccess: async () => {
      await utils.apiKeys.invalidate();
      showToast("API key removed successfully!", "success");
    },
    onError: (error) => {
      console.error("Failed to remove API key:", error);
      showToast("Failed to remove API key. Please try again.", "error");
    },
  });

  const currentModelData = AVAILABLE_MODELS.find((m) => m.id === selectedModel);

  const handleSectionChange = (newSection: typeof section) => {
    setSection(newSection);
  };

  const handleLogout = async () => {
    try {
      await signOut("/login");
      closeSettings();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const addApiKey = async () => {
    if (!newApiKey.trim()) return;

    setApiKeyMutation.mutate({
      provider: "openrouter",
      key: newApiKey.trim(),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !setApiKeyMutation.isPending && newApiKey.trim()) {
      e.preventDefault();
      addApiKey();
    }
  };

  const removeApiKey = async () => {
    removeApiKeyMutation.mutate({
      provider: "openrouter",
    });
  };

  const toggleKeyVisibility = () => {
    setHiddenKey(!hiddenKey);
  };

  const copyApiKey = async (key: string) => {
    await copy(key);
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return "••••••••";
    return key.slice(0, 4) + "••••••••" + key.slice(-4);
  };

  const sections = [
    {
      id: "settings" as const,
      label: "Settings",
      icon: Settings,
    },
    {
      id: "api-keys" as const,
      label: "API Keys",
      icon: Key,
    },
    {
      id: "shortcuts" as const,
      label: "Keyboard Shortcuts",
      icon: Keyboard,
    },
  ];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={closeSettings}>
        <DialogContent className="!max-w-3xl w-full h-[500px] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-subtle sticky top-0 bg-surface-primary z-10">
            <DialogTitle className="text-lg font-semibold">
              Settings
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-[200px_1fr]">
            <div className="border-r border-subtle p-4 overflow-y-auto">
              <nav className="space-y-1">
                {sections.map((navSection) => {
                  const Icon = navSection.icon;
                  return (
                    <button
                      key={navSection.id}
                      onClick={() => handleSectionChange(navSection.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left",
                        navSection.id === section
                          ? "bg-surface-secondary text-foreground-default"
                          : "text-foreground-subtle hover:text-foreground-default hover:bg-surface-hover"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {navSection.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="overflow-y-auto h-[calc(500px-73px)]">
              <AnimatePresence mode="wait">
                {section === "settings" && (
                  <motion.div
                    key="settings"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="p-8 space-y-6"
                  >
                    <div>
                      <h2 className="text-lg font-semibold mb-4">
                        General Settings
                      </h2>

                      <div className="space-y-4">
                        <div className="p-4 bg-surface-secondary rounded-lg">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-primary-foreground">
                                {currentModelData?.name.charAt(0) || "M"}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                Active Model
                              </p>
                              <p className="text-xs text-foreground-muted">
                                {currentModelData?.name || "No model selected"}
                              </p>
                            </div>
                          </div>
                          {currentModelData && (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {currentModelData.provider}
                              </Badge>
                              {currentModelData.free && (
                                <Badge variant="success" className="text-xs">
                                  Free
                                </Badge>
                              )}
                              {!currentModelData.free && (
                                <Badge variant="warning" className="text-xs">
                                  Premium
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        {user && (
                          <div className="p-4 bg-surface-secondary rounded-lg">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-primary-foreground" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {user.name}
                                </p>
                                <p className="text-xs text-foreground-muted">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleLogout}
                              className="w-full"
                            >
                              <LogOut className="w-4 h-4 mr-2" />
                              Sign Out
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {section === "api-keys" && (
                  <motion.div
                    key="api-keys"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="p-8 space-y-6"
                  >
                    <div>
                      <h2 className="text-lg font-semibold mb-2">API Keys</h2>
                      <p className="text-sm text-foreground-muted mb-6">
                        Manage your OpenRouter API key to access premium models.
                        Keys are stored securely in encrypted cookies.
                      </p>

                      <div className="space-y-4">
                        {hasApiKey && currentApiKey?.key ? (
                          <div className="p-4 bg-surface-secondary rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Key className="w-4 h-4 text-success" />
                                <span className="font-medium text-sm">
                                  OpenRouter API Key
                                </span>
                                <Badge variant="success" className="text-xs">
                                  Active
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={toggleKeyVisibility}
                                  className="h-8 w-8 p-0"
                                >
                                  {hiddenKey ? (
                                    <Eye className="w-4 h-4" />
                                  ) : (
                                    <EyeOff className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyApiKey(currentApiKey.key!)}
                                  className="h-8 w-8 p-0"
                                >
                                  {copied ? (
                                    <Check className="w-4 h-4 text-success" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={removeApiKey}
                                  className="h-8 w-8 p-0 text-error hover:text-error"
                                  disabled={removeApiKeyMutation.isPending}
                                >
                                  {removeApiKeyMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>

                            <div className="relative">
                              <motion.div
                                animate={{
                                  filter: hiddenKey ? "blur(4px)" : "blur(0px)",
                                }}
                                transition={{ duration: 0.2 }}
                                className={cn(
                                  "font-mono text-xs bg-surface-primary p-3 rounded border break-all",
                                  hiddenKey
                                    ? "pointer-events-none"
                                    : "pointer-events-auto"
                                )}
                              >
                                {hiddenKey
                                  ? maskKey(currentApiKey.key)
                                  : currentApiKey.key}
                              </motion.div>
                            </div>

                            <div className="mt-4">
                              <ApiKeyStats provider="openrouter" />
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-surface-secondary rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                              <AlertCircle className="w-4 h-4 text-warning" />
                              <span className="font-medium text-sm">
                                No API Key Found
                              </span>
                            </div>
                            <p className="text-xs text-foreground-muted mb-4">
                              Add your OpenRouter API key to access premium
                              models like GPT-4, Claude, and more.
                            </p>

                            <div className="space-y-3">
                              <div className="relative">
                                <Input
                                  type={hiddenKey ? "password" : "text"}
                                  placeholder="sk-or-v1-..."
                                  value={newApiKey}
                                  onChange={(e) => setNewApiKey(e.target.value)}
                                  className="pr-10"
                                  disabled={setApiKeyMutation.isPending}
                                  onKeyDown={handleKeyDown}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={toggleKeyVisibility}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                                  type="button"
                                >
                                  {hiddenKey ? (
                                    <Eye className="w-3 h-3" />
                                  ) : (
                                    <EyeOff className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>

                              <Button
                                onClick={addApiKey}
                                disabled={
                                  !newApiKey.trim() ||
                                  setApiKeyMutation.isPending
                                }
                                className="w-full"
                              >
                                {setApiKeyMutation.isPending ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add API Key
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        )}

                        <Separator />

                        <div className="p-4 bg-info/10 border border-info/20 rounded-lg">
                          <h3 className="font-medium text-sm mb-2 text-info">
                            How to get your OpenRouter API Key
                          </h3>
                          <ol className="text-xs text-foreground-muted space-y-1 list-decimal list-inside">
                            <li>
                              Visit{" "}
                              <a
                                href="https://openrouter.ai"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-info hover:underline"
                              >
                                openrouter.ai
                              </a>
                            </li>
                            <li>Sign up or log in to your account</li>
                            <li>Go to the API Keys section</li>
                            <li>Create a new API key</li>
                            <li>Copy and paste it above</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {section === "shortcuts" && (
                  <motion.div
                    key="shortcuts"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="p-8 space-y-6"
                  >
                    <div>
                      <h2 className="text-lg font-semibold mb-2">
                        Keyboard Shortcuts
                      </h2>
                      <p className="text-sm text-foreground-muted mb-6">
                        Use these keyboard shortcuts to navigate and interact
                        with the application more efficiently.
                      </p>

                      <div className="space-y-6">
                        {["chat", "settings", "navigation"].map((category) => {
                          const categoryShortcuts = shortcuts.filter(
                            (shortcut) => shortcut.category === category
                          );

                          if (categoryShortcuts.length === 0) return null;

                          return (
                            <div key={category} className="space-y-3">
                              <h3 className="text-sm font-medium text-foreground-default capitalize">
                                {category}
                              </h3>
                              <div className="space-y-2">
                                {categoryShortcuts.map((shortcut, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg"
                                  >
                                    <span className="text-sm text-foreground-default">
                                      {shortcut.description}
                                    </span>
                                    <ShortcutBadge
                                      shortcut={getShortcutDisplay(shortcut)}
                                      size="sm"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
