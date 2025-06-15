"use client";

import { useState } from "react";
import { Plus, MessageSquare } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useConversations } from "@/hooks/use-conversations";
import { useNavigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ConversationMenu } from "@/components/conversations/conversation-menu";
import { useChatContext } from "@/contexts/chat-context";
import { ConversationSearch } from "../conversations/conversation-search";
import { useGuestStorage } from "@/hooks/use-local-storage";
import { useAuth } from "@/hooks/use-auth";
import { ShortcutBadge } from "@/components/ui/shortcut-badge";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

export function ConversationsSidebar() {
  const { id: currentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const { getShortcutDisplay, shortcuts } = useKeyboardShortcuts();

  const { conversations, isLoading, deleteConversation, updateConversation } =
    useConversations();

  const guestStorage = useGuestStorage();

  const { switchToConversation } = useChatContext();

  const isGuest = !isAuthenticated;
  const displayConversations = isGuest
    ? guestStorage.conversations.map((conv) => ({
        id: conv.id,
        title: conv.title,
        model: conv.model,
        createdAt: new Date(conv.createdAt),
        updatedAt: new Date(conv.updatedAt),
      }))
    : conversations;

  const newChatShortcut = shortcuts.find((s) => s.description === "New chat");

  const handleNewConversation = () => {
    navigate("/conversations");
  };

  const handleConversationClick = (conversationId: string) => {
    if (editingId === conversationId) return;

    const conversation = displayConversations.find(
      (c) => c.id === conversationId
    );

    switchToConversation(conversationId, conversation?.model);
    navigate(`/conversations/${conversationId}`);
  };

  const handleDelete = async (id: string) => {
    if (isGuest) {
      guestStorage.deleteConversation(id);
    } else {
      await deleteConversation({ id });
    }

    if (currentId === id) {
      navigate("/conversations");
    }
  };

  const handleRename = async (id: string, newTitle: string) => {
    if (isGuest) {
      guestStorage.updateConversation(id, { title: newTitle });
    } else {
      await updateConversation({ id, title: newTitle });
    }
  };

  const handleStartEdit = (id: string) => {
    setEditingId(id);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const filteredConversations = displayConversations.filter((conversation) =>
    conversation.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Sidebar className="border-r border-default/50">
      <SidebarHeader className="p-4">
        <ConversationSearch
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleNewConversation}
                  className="h-10 bg-primary rounded-3xl text-white hover:bg-primary-hover auth-surface border-primary/20 font-mono justify-between"
                  size="lg"
                >
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    <span>New Chat</span>
                  </div>
                  {newChatShortcut && (
                    <ShortcutBadge
                      shortcut={getShortcutDisplay(newChatShortcut)}
                      className="opacity-70"
                    />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            {isGuest ? "Local Chats" : "Chats"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {isLoading && !isGuest ? (
              <div className="space-y-2 p-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-8 bg-surface-secondary rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <MessageSquare className="w-8 h-8 text-foreground-muted mb-2" />
                <p className="text-sm text-foreground-muted">
                  {searchQuery
                    ? "No conversations found"
                    : "No conversations yet"}
                </p>
              </div>
            ) : (
              <SidebarMenu className="flex flex-col gap-1">
                {filteredConversations.map((conversation) => (
                  <SidebarMenuItem key={conversation.id}>
                    <div className="group/item relative">
                      <SidebarMenuButton
                        onClick={() => handleConversationClick(conversation.id)}
                        tooltip={conversation.title}
                        className={cn(
                          "relative font-sans text-sm w-full justify-start pr-8",
                          currentId === conversation.id &&
                            "bg-surface-secondary",
                          editingId === conversation.id && "pointer-events-none"
                        )}
                      >
                        {editingId !== conversation.id && (
                          <div className="truncate">{conversation.title}</div>
                        )}
                      </SidebarMenuButton>

                      <ConversationMenu
                        conversationId={conversation.id}
                        conversationTitle={conversation.title}
                        onDelete={handleDelete}
                        onRename={handleRename}
                        isEditing={editingId === conversation.id}
                        onStartEdit={() => handleStartEdit(conversation.id)}
                        onCancelEdit={handleCancelEdit}
                      />
                    </div>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
