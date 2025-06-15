import { api } from "@/trpc/react";
import { useSession } from "./use-auth";

export function useConversations() {
  const session = useSession();
  const utils = api.useUtils();

  const conversations = api.conversations.getAll.useQuery(undefined, {
    enabled: !!session?.userId,
  });

  const deleteConversation = api.conversations.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.conversations.getAll.cancel();

      const previousConversations = utils.conversations.getAll.getData();

      utils.conversations.getAll.setData(undefined, (old) =>
        old ? old.filter((conv) => conv.id !== id) : []
      );

      return { previousConversations };
    },
    onError: (err, variables, context) => {
      if (context?.previousConversations) {
        utils.conversations.getAll.setData(
          undefined,
          context.previousConversations
        );
      }
    },
    onSettled: () => {
      void utils.conversations.getAll.invalidate();
    },
  });

  const updateConversation = api.conversations.update.useMutation({
    onMutate: async ({ id, title }) => {
      await utils.conversations.getAll.cancel();

      const previousConversations = utils.conversations.getAll.getData();

      if (title) {
        utils.conversations.getAll.setData(undefined, (old) =>
          old
            ? old.map((conv) => (conv.id === id ? { ...conv, title } : conv))
            : []
        );
      }

      return { previousConversations };
    },
    onError: (err, variables, context) => {
      if (context?.previousConversations) {
        utils.conversations.getAll.setData(
          undefined,
          context.previousConversations
        );
      }
    },
    onSettled: () => {
      void utils.conversations.getAll.invalidate();
    },
  });

  return {
    conversations: conversations.data || [],
    isLoading: conversations.isLoading,
    error: conversations.error,
    deleteConversation: deleteConversation.mutateAsync,
    updateConversation: updateConversation.mutateAsync,
    isDeleting: deleteConversation.isPending,
    isUpdating: updateConversation.isPending,
    refetch: conversations.refetch,
  };
}
