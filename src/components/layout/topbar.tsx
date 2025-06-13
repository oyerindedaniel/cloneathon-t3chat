"use client";

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
import {
  Share2,
  Settings,
  LogOut,
  User,
  Palette,
  Key,
  Menu,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSidebar } from "@/components/ui/sidebar";
import { ModeToggler } from "@/components/mode-toggler";

interface TopbarProps {
  user?: {
    name?: string | null;
    email: string;
    image?: string | null;
  };
}

export function Topbar({ user }: TopbarProps) {
  const { signOut } = useAuth();
  const { toggleSidebar } = useSidebar();

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user?.email.charAt(0).toUpperCase() || "U";

  const handleLogout = async () => {
    try {
      await signOut("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="border-b border-default/30 bg-surface-primary px-6 py-4 fixed top-0 left-0 md:left-[calc(var(--sidebar-width))] h-[var(--topbar-height)] right-0 z-100 group-data-[state=collapsed]:left-0">
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
          <Button variant="outline" size="sm" className="gap-2 font-sans">
            <Share2 className="w-3 h-3" />
            <span className="hidden sm:inline">Share</span>
          </Button>

          {user && (
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

              <DropdownMenuContent align="end" className="w-56 font-sans">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium text-foreground-default">
                      {user?.name || "User"}
                    </p>
                    <p className="text-xs text-foreground-muted">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <User className="w-4 h-4 text-foreground-subtle" />
                  Profile
                </DropdownMenuItem>

                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <Settings className="w-4 h-4 text-foreground-subtle" />
                  Settings
                </DropdownMenuItem>

                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <Key className="w-4 h-4 text-foreground-subtle" />
                  API Keys
                </DropdownMenuItem>

                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <Palette className="w-4 h-4 text-foreground-subtle" />
                  Theme
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <ModeToggler />
        </div>
      </div>
    </div>
  );
}
