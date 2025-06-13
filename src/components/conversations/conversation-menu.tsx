import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2, Edit3 } from "lucide-react";
import { DeleteConversationModal } from "./delete-conversation-modal";

interface ConversationMenuProps {
  conversationId: string;
  conversationTitle: string;
  onDelete: (id: string) => Promise<void>;
  onRename: (id: string, newTitle: string) => Promise<void>;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
}

export function ConversationMenu({
  conversationId,
  conversationTitle,
  onDelete,
  onRename,
  isEditing,
  onStartEdit,
  onCancelEdit,
}: ConversationMenuProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editTitle, setEditTitle] = useState(conversationTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDelete = async () => {
    try {
      await onDelete(conversationId);
      setShowDeleteModal(false);
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  const handleRename = async () => {
    if (editTitle.trim() && editTitle.trim() !== conversationTitle) {
      try {
        await onRename(conversationId, editTitle.trim());
      } catch (error) {
        console.error("Failed to rename conversation:", error);
        setEditTitle(conversationTitle);
      }
    }
    onCancelEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRename();
    } else if (e.key === "Escape") {
      setEditTitle(conversationTitle);
      onCancelEdit();
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={editTitle}
        onChange={(e) => setEditTitle(e.target.value)}
        onBlur={handleRename}
        onKeyDown={handleKeyDown}
        className="absolute inset-0 bg-transparent text-sm font-medium text-foreground-default border-none outline-none px-3 py-2"
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <>
      <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 transition-opacity z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onStartEdit();
              }}
            >
              <Edit3 className="w-3 h-3 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteModal(true);
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-3 h-3 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DeleteConversationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        conversationTitle={conversationTitle}
      />
    </>
  );
}
