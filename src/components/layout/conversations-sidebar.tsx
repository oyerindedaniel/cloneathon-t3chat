"use client";

import { Plus, MessageSquare, Search, Calendar, Archive } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { GridCross } from "@/components/ui/grid-cross";

export function ConversationsSidebar() {
  const conversations = [
    { id: "1", title: "AI Assistant Help", time: "2m ago", unread: true },
    { id: "2", title: "Code Review Discussion", time: "1h ago", unread: false },
    { id: "3", title: "Project Planning", time: "3h ago", unread: false },
    { id: "4", title: "Technical Questions", time: "1d ago", unread: false },
    { id: "5", title: "Bug Report Analysis", time: "2d ago", unread: false },
  ];

  const todayConversations = conversations.slice(0, 2);
  const yesterdayConversations = conversations.slice(2, 4);
  const olderConversations = conversations.slice(4);

  return (
    <Sidebar collapsible="icon" className="border-r border-default/50">
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground-default group-data-[collapsible=icon]:hidden">
              Conversations
            </span>
          </div>
          <Button
            size="sm"
            className="h-7 w-7 p-0 group-data-[collapsible=icon]:hidden"
            variant="ghost"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="group-data-[collapsible=icon]:hidden">
          <SidebarInput
            placeholder="Search conversations..."
            className="h-8 bg-surface-tertiary border-default/30"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="h-10 bg-primary text-white hover:bg-primary-hover auth-surface border-primary/20"
                  size="lg"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            Today
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {todayConversations.map((conversation) => (
                <SidebarMenuItem key={conversation.id}>
                  <SidebarMenuButton
                    tooltip={conversation.title}
                    className="relative group"
                  >
                    <MessageSquare className="w-4 h-4 text-foreground-subtle" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">
                        {conversation.title}
                      </div>
                      <div className="text-xs text-foreground-muted">
                        {conversation.time}
                      </div>
                    </div>
                    {conversation.unread && (
                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                    )}

                    <GridCross
                      position="relative"
                      size="sm"
                      opacity={0.1}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ transform: "scale(0.3)" }}
                    />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Yesterday</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {yesterdayConversations.map((conversation) => (
                <SidebarMenuItem key={conversation.id}>
                  <SidebarMenuButton tooltip={conversation.title}>
                    <MessageSquare className="w-4 h-4 text-foreground-subtle" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{conversation.title}</div>
                      <div className="text-xs text-foreground-muted">
                        {conversation.time}
                      </div>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Archive className="w-3 h-3" />
            Previous 7 days
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {olderConversations.map((conversation) => (
                <SidebarMenuItem key={conversation.id}>
                  <SidebarMenuButton tooltip={conversation.title}>
                    <MessageSquare className="w-4 h-4 text-foreground-subtle" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{conversation.title}</div>
                      <div className="text-xs text-foreground-muted">
                        {conversation.time}
                      </div>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
