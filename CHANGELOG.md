# Changelog

This document outlines the key changes and improvements made to the application, focusing on conversation management and UI optimizations.

## Version 0.1.1 (WIP)

### New Features

- **Server-Side Conversation Search**: Implemented a new tRPC procedure `api.conversations.search` in `src/server/api/routers/conversations.ts` to allow searching conversations by title directly on the server, with support for pagination.

### Improvements

- **Optimized Conversation Fetching**:
  - The `useConversations` hook (`src/hooks/use-conversations.ts`) was refactored to conditionally use `api.conversations.getAll` or `api.conversations.search` based on the presence of a search query. This ensures that only relevant data is fetched from the server, improving performance for large conversation lists.
  - Switched from dynamic `useInfiniteQuery` selection to two separate `useInfiniteQuery` calls with conditional enabling for better type safety and maintainability.
- **Enhanced Optimistic UI Updates**:
  - The `deleteConversation` and `updateConversation` mutations in `src/hooks/use-conversations.ts` were updated to leverage `setInfiniteData` for optimistic updates and rollbacks, completely replacing `invalidate` calls. This provides instant UI feedback and ensures data consistency even in case of network errors.
- **Infinite Scrolling for Conversations**:
  - The `ConversationsSidebar` component (`src/components/layout/conversations-sidebar.tsx`) now supports infinite scrolling, automatically loading more conversations as the user scrolls to the bottom of the list.
  - A loading skeleton (`SidebarMenuButtonSkeleton`) is displayed when more conversations are being fetched.
- **Debounced Search Input**: Implemented a `useDebounce` hook (`src/hooks/use-debounce.ts`) and integrated it into `src/components/layout/conversations-sidebar.tsx` to delay the server-side search query, improving performance.
- **Cache-First Search Strategy**: The `ConversationsSidebar` now performs a client-side filter on already loaded conversations first. If a match is found in the local cache, it's displayed immediately, reducing the need for unnecessary server requests and providing quicker feedback to the user.

### Bug Fixes

- **Type Compatibility**:
  - Resolved numerous TypeScript errors related to type mismatches between server-fetched `Conversation` objects and locally stored `GuestConversation` objects.
  - A new `DisplayConversation` interface was introduced in `src/components/layout/conversations-sidebar.tsx` to unify the type for displaying conversations, ensuring consistent data structure across different conversation sources.
  - Corrected typing for `lastPage` and `page` parameters in `useInfiniteQuery` callbacks and for `conv` in `map` and `find` functions, improving type inference and eliminating implicit `any` types.
- **Incorrect Query Arguments**: Fixed issues where `searchQueryOptions` were incorrectly passed as string arguments to tRPC `getInfiniteData` and `setInfiniteData` methods.
- **Optimistic Update Logic**: Ensured that the `pages` array structure is correctly preserved during optimistic updates in `updateConversation`'s `setInfiniteData` calls.
- **Robust Error Parsing**: Refactored `parseOpenRouterError` in `src/lib/utils/openrouter-errors.ts` to correctly handle `APICallError` instances from the AI SDK, ensuring type safety by avoiding `any` casts and using `APICallError.isInstance` for more reliable error detection and parsing.
- **Unified Message Type**: Updated the `Message` type in `src/server/db/schema.ts` to extend the `Message` type from the `@ai` SDK, ensuring consistent message type definitions across the application and preventing potential type mismatches.
