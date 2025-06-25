import { api } from "@/trpc/react";
import { useSession } from "./use-auth";
import { CONVERSATION_QUERY_LIMIT } from "@/constants/conversations";
import type { inferRouterOutputs } from "@trpc/server";
import { AppRouter } from "@/server/api/root";

type ConversationsRouterOutput = inferRouterOutputs<AppRouter>["conversations"];

type GetAllOutput = ConversationsRouterOutput["getAll"];
type SearchOutput = ConversationsRouterOutput["search"];

export function useConversations(searchQuery: string = "") {
  const session = useSession();
  const utils = api.useUtils();

  const getAllQuery = api.conversations.getAll.useInfiniteQuery(
    { limit: CONVERSATION_QUERY_LIMIT },
    {
      enabled: !!session?.userId && !searchQuery,
      getNextPageParam: (lastPage: GetAllOutput) => lastPage.nextCursor,
      initialCursor: undefined,
    }
  );

  const searchQueryOptions = {
    limit: CONVERSATION_QUERY_LIMIT,
    query: searchQuery,
  };

  const searchConversationsQuery = api.conversations.search.useInfiniteQuery(
    searchQueryOptions,
    {
      enabled: !!session?.userId && !!searchQuery,
      getNextPageParam: (lastPage: SearchOutput) => lastPage.nextCursor,
      initialCursor: undefined,
    }
  );

  const conversations = searchQuery
    ? searchConversationsQuery.data?.pages.flatMap(
        (page: SearchOutput) => page.conversations
      )
    : getAllQuery.data?.pages.flatMap(
        (page: GetAllOutput) => page.conversations
      );

  const isLoading = searchQuery
    ? searchConversationsQuery.isLoading
    : getAllQuery.isLoading;
  const error = searchQuery
    ? searchConversationsQuery.error
    : getAllQuery.error;
  const fetchNextPage = searchQuery
    ? searchConversationsQuery.fetchNextPage
    : getAllQuery.fetchNextPage;
  const hasNextPage = searchQuery
    ? searchConversationsQuery.hasNextPage
    : getAllQuery.hasNextPage;
  const isFetchingNextPage = searchQuery
    ? searchConversationsQuery.isFetchingNextPage
    : getAllQuery.isFetchingNextPage;

  const deleteConversation = api.conversations.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.conversations.getAll.cancel();
      if (searchQuery) {
        await utils.conversations.search.cancel({ query: searchQuery });
      }

      const previousConversationsGetAll =
        utils.conversations.getAll.getInfiniteData({
          limit: CONVERSATION_QUERY_LIMIT,
        });
      const previousConversationsSearch = searchQuery
        ? utils.conversations.search.getInfiniteData(searchQueryOptions)
        : undefined;

      utils.conversations.getAll.setInfiniteData(
        { limit: CONVERSATION_QUERY_LIMIT },
        (old) => {
          if (!old) return undefined;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              conversations: page.conversations.filter(
                (conv) => conv.id !== id
              ),
            })),
          };
        }
      );

      if (searchQuery) {
        utils.conversations.search.setInfiniteData(
          searchQueryOptions,
          (old) => {
            if (!old) return undefined;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                conversations: page.conversations.filter(
                  (conv) => conv.id !== id
                ),
              })),
            };
          }
        );
      }

      return {
        previousConversationsGetAll,
        previousConversationsSearch,
      };
    },
    onError: (err, variables, context) => {
      if (context?.previousConversationsGetAll) {
        utils.conversations.getAll.setInfiniteData(
          { limit: CONVERSATION_QUERY_LIMIT },
          context.previousConversationsGetAll
        );
      }
      if (searchQuery && context?.previousConversationsSearch) {
        utils.conversations.search.setInfiniteData(
          searchQueryOptions,
          context.previousConversationsSearch
        );
      }
    },
    onSettled: () => {},
  });

  const updateConversation = api.conversations.update.useMutation({
    onMutate: async ({ id, title }) => {
      await utils.conversations.getAll.cancel();
      if (searchQuery) {
        await utils.conversations.search.cancel({ query: searchQuery });
      }

      const previousConversationsGetAll =
        utils.conversations.getAll.getInfiniteData({
          limit: CONVERSATION_QUERY_LIMIT,
        });
      const previousConversationsSearch = searchQuery
        ? utils.conversations.search.getInfiniteData(searchQueryOptions)
        : undefined;

      if (title) {
        utils.conversations.getAll.setInfiniteData(
          { limit: CONVERSATION_QUERY_LIMIT },
          (old) => {
            if (!old) return undefined;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                conversations: page.conversations.map((conv) =>
                  conv.id === id ? { ...conv, title } : conv
                ),
              })),
            };
          }
        );

        if (searchQuery) {
          utils.conversations.search.setInfiniteData(
            searchQueryOptions,
            (old) => {
              if (!old) return undefined;
              return {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  conversations: page.conversations.map((conv) =>
                    conv.id === id ? { ...conv, title } : conv
                  ),
                })),
              };
            }
          );
        }
      }

      return {
        previousConversationsGetAll,
        previousConversationsSearch,
      };
    },
    onError: (err, variables, context) => {
      if (context?.previousConversationsGetAll) {
        utils.conversations.getAll.setInfiniteData(
          { limit: CONVERSATION_QUERY_LIMIT },
          context.previousConversationsGetAll
        );
      }
      if (searchQuery && context?.previousConversationsSearch) {
        utils.conversations.search.setInfiniteData(
          searchQueryOptions,
          context.previousConversationsSearch
        );
      }
    },
    onSettled: () => {},
  });

  return {
    conversations: conversations || [],
    isLoading,
    error,
    deleteConversation: deleteConversation.mutateAsync,
    updateConversation: updateConversation.mutateAsync,
    isDeleting: deleteConversation.isPending,
    isUpdating: updateConversation.isPending,
    refetch: searchQuery
      ? searchConversationsQuery.refetch
      : getAllQuery.refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
}

export function useConversation({
  id,
  isNewConversation = false,
  isSharedLink = false,
}: {
  id: string | null;
  isNewConversation?: boolean;
  isSharedLink?: boolean;
}) {
  const session = useSession();

  const enabledForUserConversation =
    !!id && !!session?.userId && !isNewConversation && !isSharedLink;

  const enabledForSharedConversation = !!id && isSharedLink;

  const conversationQuery = api.conversations.getById.useQuery(
    { id: id! },
    {
      enabled: enabledForUserConversation,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    }
  );

  const sharedConversationQuery = api.conversations.getSharedById.useQuery(
    { shareId: id! },
    {
      enabled: enabledForSharedConversation,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    }
  );

  const conversationData = isSharedLink
    ? sharedConversationQuery.data
    : conversationQuery.data;

  const isLoading = isSharedLink
    ? sharedConversationQuery.isLoading
    : conversationQuery.isLoading;

  const isError = isSharedLink
    ? sharedConversationQuery.isError
    : conversationQuery.isError;

  const error = isSharedLink
    ? sharedConversationQuery.error
    : conversationQuery.error;

  const status = isSharedLink
    ? sharedConversationQuery.status
    : conversationQuery.status;

  return {
    conversation: conversationData,
    isLoading,
    isError,
    error,
    status,
    isCurrentlyShared: isSharedLink && !!sharedConversationQuery.data,
  };
}
