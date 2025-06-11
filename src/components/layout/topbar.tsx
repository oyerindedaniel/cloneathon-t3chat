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
import { GridCross } from "@/components/ui/grid-cross";
import {
  Share2,
  Settings,
  LogOut,
  User,
  Palette,
  Key,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface TopbarProps {
  user?: {
    name?: string | null;
    email: string;
    image?: string | null;
  };
}

export function Topbar({ user }: TopbarProps) {
  const { signOut } = useAuth();

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
    <div className="auth-surface border-b border-default/50 px-6 py-3 relative">
      <GridCross position="tl" size="sm" opacity={0.2} />
      <GridCross position="tr" size="sm" opacity={0.2} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center relative">
            <span className="text-primary font-bold text-sm">T3</span>
            <GridCross
              position="relative"
              size="sm"
              opacity={0.2}
              className="absolute -top-1 -right-1"
              style={{ transform: "scale(0.4)" }}
            />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground-default">
              T3 Chat Cloneathon
            </h1>
            <p className="text-xs text-foreground-muted">AI Conversations</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-surface-primary hover:bg-surface-hover border-default/50"
          >
            <Share2 className="w-3 h-3" />
            <span className="hidden sm:inline">Share</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 h-9 px-2 hover:bg-surface-hover relative group"
              >
                <Avatar className="size-6">
                  <AvatarImage src={user?.image || undefined} />
                  <AvatarFallback className="text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm font-medium text-foreground-default">
                  {user?.name || user?.email || "User"}
                </span>
                <ChevronDown className="w-3 h-3 text-foreground-muted group-hover:text-foreground-default transition-colors" />

                <div className="absolute inset-0 rounded-md bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-56 auth-surface border-default/50 relative"
            >
              <GridCross
                position="relative"
                size="sm"
                opacity={0.1}
                className="absolute top-2 right-2"
                style={{ transform: "scale(0.5)" }}
              />

              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-foreground-default">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-foreground-muted">{user?.email}</p>
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
                className="gap-2 cursor-pointer text-error hover:text-error"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
