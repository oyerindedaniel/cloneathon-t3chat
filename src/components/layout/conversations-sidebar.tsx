"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { v4 as uuidv4 } from "uuid";
import { useConversations } from "@/hooks/use-conversations";
import { useNavigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ConversationMenu } from "@/components/conversations/conversation-menu";
import { useChatControls } from "@/contexts/chat-context";
import { ConversationSearch } from "../conversations/conversation-search";
import { useAuth } from "@/hooks/use-auth";
import { ShortcutBadge } from "@/components/ui/shortcut-badge";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import SidebarMenuButtonSkeleton from "./sidebar-menu-button-skeleton";
import { useInView } from "react-intersection-observer";
import { type Message } from "@/server/db/schema";
import {
  useGuestStorage,
  type GuestConversation,
} from "@/contexts/guest-storage-context";
import { Message as AIMessage } from "ai";
import { useDebounce } from "@/hooks/use-debounce";

interface DisplayConversation {
  id: string;
  title: string;
  model: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessage: Message | AIMessage | null;
}

export function ConversationsSidebar() {
  const { id: currentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const { getShortcutDisplay, shortcuts } = useKeyboardShortcuts();

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const {
    conversations,
    isLoading,
    deleteConversation,
    updateConversation,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useConversations(debouncedSearchQuery);

  const guestStorage = useGuestStorage();

  const { switchToConversation, handleNewConversation } = useChatControls();

  const isGuest = !isAuthenticated;
  const allConversations: DisplayConversation[] = useMemo(() => {
    if (isGuest) {
      return guestStorage.conversations.map((conv: GuestConversation) => ({
        id: conv.id,
        title: conv.title,
        model: conv.model,
        createdAt: new Date(conv.createdAt),
        updatedAt: new Date(conv.updatedAt),
        lastMessage:
          conv.messages.length > 0
            ? conv.messages[conv.messages.length - 1]
            : null,
      }));
    }

    return conversations.map((conv) => ({
      id: conv.id,
      title: conv.title,
      model: conv.model,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt || conv.createdAt,
      lastMessage: conv.lastMessage,
    }));
  }, [isGuest, guestStorage.conversations, conversations]);

  const filteredDisplayConversations: DisplayConversation[] = useMemo(() => {
    return allConversations.filter((conversation) =>
      conversation.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allConversations, searchQuery]);

  const newChatShortcut = useMemo(() => {
    return shortcuts.find((s) => s.description === "New chat");
  }, [shortcuts]);

  const handleConversationClick = useCallback(
    (conversationId: string) => {
      if (editingId === conversationId) return;

      const conversation = filteredDisplayConversations.find(
        (c: DisplayConversation) => c.id === conversationId
      );

      switchToConversation(conversationId, conversation?.model);
    },
    [editingId, filteredDisplayConversations, navigate, switchToConversation]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (isGuest) {
        guestStorage.deleteConversation(id);
      } else {
        await deleteConversation({ id });
      }

      if (currentId === id) {
        navigate("/conversations");
      }
    },
    [isGuest, currentId, deleteConversation, navigate]
  );

  const handleRename = useCallback(
    async (id: string, newTitle: string) => {
      if (isGuest) {
        guestStorage.updateConversation(id, { title: newTitle });
      } else {
        await updateConversation({ id, title: newTitle });
      }
    },
    [isGuest, updateConversation]
  );

  const handleStartEdit = useCallback(
    (id: string) => {
      setEditingId(id);
    },
    [setEditingId]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
  }, [setEditingId]);

  const { ref: inViewRef, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <Sidebar variant="inset" className="border-r border-default/50">
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
          <SidebarGroupContent className="pb-2 flex-1 overflow-y-auto">
            {isLoading &&
            !isGuest &&
            filteredDisplayConversations.length === 0 ? (
              <SidebarMenuButtonSkeleton />
            ) : filteredDisplayConversations.length === 0 ? (
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
                {filteredDisplayConversations.map(
                  (conversation: DisplayConversation, index: number) => {
                    const isLastItem =
                      index === filteredDisplayConversations.length - 1;
                    return (
                      <SidebarMenuItem key={conversation.id}>
                        <div className="group/item relative">
                          <SidebarMenuButton
                            onClick={() =>
                              handleConversationClick(conversation.id)
                            }
                            className={cn(
                              "relative font-sans text-sm w-full justify-start pr-8 hover:bg-surface-secondary",
                              currentId === conversation.id &&
                                "bg-surface-secondary",
                              editingId === conversation.id &&
                                "pointer-events-none"
                            )}
                          >
                            {editingId !== conversation.id && (
                              <div className="truncate">
                                {conversation.title}
                              </div>
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
                        {isLastItem && hasNextPage && (
                          <div ref={inViewRef} className="h-1" />
                        )}
                      </SidebarMenuItem>
                    );
                  }
                )}
                {isFetchingNextPage && <SidebarMenuButtonSkeleton />}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
