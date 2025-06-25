"use client";

import React, { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Share2, Settings, LogOut, User, Key, Menu } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSidebar } from "@/components/ui/sidebar";
import { ModeToggler } from "@/components/mode-toggler";
import { useSettings } from "@/contexts/settings-context";
import { ShortcutBadge } from "@/components/ui/shortcut-badge";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useChatControls, useChatSessionStatus } from "@/contexts/chat-context";
import { api } from "@/trpc/react";
import { useClipboard } from "@/hooks/use-clipboard";
import { useToast } from "@/hooks/use-toast";

const TopbarComponent = function Topbar() {
  const { user, signOut } = useAuth();
  const { open, toggleSidebar } = useSidebar();
  const { openSettings } = useSettings();
  const { getShortcutDisplay, shortcuts } = useKeyboardShortcuts();
  const { currentConversationId } = useChatControls();
  const { isGuest } = useChatSessionStatus();
  const { copy } = useClipboard();
  const { showToast } = useToast();

  const shareConversationMutation = api.conversations.share.useMutation({
    onSuccess: (data) => {
      const shareUrl = `${window.location.origin}/conversations/share/${data.shareId}`;
      copy(shareUrl);
      showToast("Share link copied! Enjoy sharing!", "success");
    },
    onError: (error) => {
      showToast("Failed to create share link. Please try again.", "error");
    },
  });

  const isShareButtonDisabled =
    !currentConversationId || isGuest || shareConversationMutation.isPending;

  const handleShareToggle = useCallback(async () => {
    if (!currentConversationId || isGuest) return;

    await shareConversationMutation.mutateAsync({
      id: currentConversationId,
    });
  }, [currentConversationId, isGuest, shareConversationMutation]);

  const settingsShortcut = shortcuts.find(
    (s) => s.description === "Open settings"
  );
  const apiKeysShortcut = shortcuts.find((s) => s.description === "API keys");

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user?.email.charAt(0).toUpperCase() || "G";

  const handleLogout = useCallback(async () => {
    try {
      await signOut("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, [signOut]);

  const state = open ? "expanded" : "collapsed";

  return (
    <div
      data-state={state}
      className="border-b border-default/30 bg-surface-primary px-6 py-4 fixed top-0 left-0 md:left-[calc(var(--sidebar-width))] h-[var(--topbar-height)] right-0 z-100 data-[state=collapsed]:!left-0 transition-transform"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="w-8 h-8"
          >
            <Menu className="w-4 h-4" />
          </Button>

          <div className="font-mono text-sm uppercase font-semibold">
            T3 CHAT CLONEATHON
          </div>
        </div>

        <div className="flex items-center gap-6">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShareToggle}
            disabled={isShareButtonDisabled}
            className="h-8 px-3"
          >
            <Share2 className="w-4 h-4 mr-2" />
            {shareConversationMutation.isPending ? "Sharing" : "Share"}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-fit p-0">
                <Avatar className="size-8">
                  <AvatarImage src={user?.image || undefined} />
                  <AvatarFallback className="text-xs font-sans">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64 font-sans">
              {user && (
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium text-foreground-default">
                      {user.name || "User"}
                    </p>
                    <p className="text-xs text-foreground-muted">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
              )}

              {user && <DropdownMenuSeparator />}

              {user && (
                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <User className="w-4 h-4 text-foreground-subtle" />
                  Profile
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                className="gap-2 cursor-pointer justify-between"
                onClick={() => openSettings("settings")}
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-foreground-subtle" />
                  Settings
                </div>
                {settingsShortcut && (
                  <ShortcutBadge
                    shortcut={getShortcutDisplay(settingsShortcut)}
                    size="sm"
                  />
                )}
              </DropdownMenuItem>

              <DropdownMenuItem
                className="gap-2 cursor-pointer justify-between"
                onClick={() => openSettings("api-keys")}
              >
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-foreground-subtle" />
                  API Keys
                </div>
                {apiKeysShortcut && (
                  <ShortcutBadge
                    shortcut={getShortcutDisplay(apiKeysShortcut)}
                    size="sm"
                  />
                )}
              </DropdownMenuItem>

              {user && <DropdownMenuSeparator />}

              {user && (
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <ModeToggler />
        </div>
      </div>
    </div>
  );
};

export const Topbar = TopbarComponent;
