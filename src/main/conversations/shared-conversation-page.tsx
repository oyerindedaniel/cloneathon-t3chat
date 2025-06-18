// "use client";

// import { useParams, useRouter } from "next/navigation";
// import React, { useCallback, useEffect } from "react";
// import { ChatMessage } from "@/components/chat/chat-message";
// import { ChatInput } from "@/components/chat/chat-input";
// import { MessageSkeleton } from "@/components/chat/message-skeleton";
// import {
//   useChatMessages,
//   useChatConfig,
//   useChatControls,
//   useChatSessionStatus,
// } from "@/contexts/chat-context";
// import { useAutoScroll } from "@/hooks/use-auto-scroll";
// import { useErrorAlert } from "@/hooks/use-error-alert";
// import { ErrorAlert } from "@/components/error-alert";
// import { useSettingsDialog } from "@/hooks/use-settings-dialog";
// import { ConnectionStatus } from "@/components/ui/connection-status";
// import { useConnectionStatus } from "@/hooks/use-connection-status";
// import { useAuth } from "@/hooks/use-auth";
// import { useConversation } from "@/hooks/use-conversations";
// import { Button } from "@/components/ui/button";
// import { Share2 } from "lucide-react";
// import { api } from "@/trpc/react";
// import { flushSync } from "react-dom";
// import { Message as AIMessage } from "ai";
// import { v4 as uuidv4 } from "uuid";
// import type { BranchStatus } from "@/server/db/schema";

// export default function SharedConversationPage() {
//   const params = useParams();
//   const shareId = params.shareId as string;
//   const router = useRouter();
//   const { openSettings } = useSettingsDialog();
//   const { session, isAuthenticated } = useAuth();
//   const { setCurrentConversationId, setIsNavigatingToNewChat } =
//     useChatControls();

// /
//   const {
//     conversation,
//     isLoading: isConversationLoading,
//     isError: isConversationError,
//     error: conversationError,
//   } = useConversation({
//     id: shareId,
//     isNavigatingToNewChat: false,
//     isSharedLink: true,
//   });

//   const {
//     messages,
//     append,
//     stop,
//     reload,
//     status,
//     error: chatError,
//     experimental_resume,
//     addToolResult,
//   } = useChatMessages();

//   useEffect(() => {
//     if (conversation) {
//       setCurrentConversationId(conversation.id);

//     }
//   }, [conversation, setCurrentConversationId]);

//   const { selectedModel, setSelectedModel } = useChatConfig();
//   const {
//     isGuest: isChatSessionGuest,
//     remainingMessages,
//     totalMessages,
//     maxMessages,
//   } = useChatSessionStatus();

//   const { messagesEndRef, lastMessageRef, temporarySpaceHeight } =
//     useAutoScroll({
//       smooth: true,
//       messages,
//       status,
//     });

//   const { isConnected, isResuming, startResuming, stopResuming } =
//     useConnectionStatus();

//   const { alertState, hideAlert, handleApiError } = useErrorAlert({
//     conversationError: {
//       isError: isConversationError,
//       error: conversationError,
//     },
//     streamStatus: status,
//     chatError,
//     onResume: reload,
//     onOpenSettings: openSettings,
//   });

//   // This mutation will be triggered on reprompt
//   const forkConversationMutation = api.conversations.forkShared.useMutation({
//     onSuccess: (newConversation) => {
//       flushSync(() => {
//         setIsNavigatingToNewChat(true);
//         router.push(`/conversations/${newConversation.id}`);
//       });
//     },
//     onError: (forkError) => {
//       console.error("Failed to fork conversation:", forkError);
//       handleApiError(forkError, "forking conversation");
//     },
//   });

// //   // Exposed handler for ChatInput onSubmit
// //   const handleRepromptAndFork = useCallback(
// //     async (messageContent: string) => {
// //       if (!messageContent.trim() || status === "streaming" || !isAuthenticated)
// //         return;

// //       try {
// //         if (!session?.user.id) {
// //           console.error("Cannot fork conversation: User not authenticated.");
// //           return;
// //         }

// //         // 1. Fork the conversation
// //         const newConversation = await forkConversationMutation.mutateAsync({
// //           shareId: shareId,
// //         });

// //         // 2. Navigate to the new conversation page. The message will be appended there.
// //         // The `onSuccess` of forkConversationMutation handles the navigation.
// //       } catch (error) {
// //         handleApiError(error, "reprompting on shared conversation");
// //       }
// //     },
// //     [
// //       status,
// //       isAuthenticated,
// //       shareId,
// //       session?.user.id,
// //       forkConversationMutation,
// //       handleApiError,
// //     ]
// //   );

//   const handleReload = () => {
//     try {
//       reload();
//     } catch (error) {
//       handleApiError(error, "reloading conversation");
//     }
//   };

//   const handleStop = () => {
//     try {
//       stop();
//     } catch (error) {
//       handleApiError(error, "stopping generation");
//     }
//   };

//   const handleImageAttach = () => {
//     console.log("Image attach clicked");
//   };

//   const handleRetryConnection = useCallback(() => {
//     if (!isConnected && experimental_resume) {
//       startResuming();
//       try {
//         experimental_resume();
//         stopResuming();
//       } catch (error) {
//         console.error("Failed to resume:", error);
//         stopResuming();
//       }
//     }
//   }, [isConnected, experimental_resume, startResuming, stopResuming]);

//   if (isConversationLoading) {
//     return (
//       <div className="h-full flex flex-col grid-pattern-background px-8">
//         <div className="flex-1 py-4 max-w-2xl mx-auto w-full">
//           <MessageSkeleton />
//         </div>
//         <div className="max-md:max-w-2xl max-md:w-full md:w-[min(42rem,_calc(100vw_-_var(--sidebar-width)_-_2rem))] fixed z-100 bottom-6 left-2/4 md:left-[calc((100vw+var(--sidebar-width))/2)] -translate-x-1/2">
//           <ChatInput
//             onSubmit={() => {}} // No direct submit here, only via handleRepromptAndFork
//             onImageAttach={() => {}}
//             selectedModel={selectedModel}
//             onModelChange={() => {}}
//             disabled={true}
//             className="flex-1"
//             isGuest={isChatSessionGuest}
//             remainingMessages={remainingMessages}
//             totalMessages={totalMessages}
//             maxMessages={maxMessages}
//           />
//         </div>
//       </div>
//     );
//   }

//   if (isConversationError) {
//     return (
//       <div className="h-full flex flex-col grid-pattern-background px-8 justify-center items-center">
//         <ErrorAlert
//           isOpen={true}
//           onClose={() => router.push("/conversations")} // Redirect to conversations on close
//           title="Shared Conversation Not Found"
//           message={
//             conversationError?.message ||
//             "The shared conversation could not be loaded. It might have been deleted or the link is invalid."
//           }
//           type="error"
//           showResume={false}
//         />
//       </div>
//     );
//   }

//   return (
//     <>
//       <div className="flex flex-col grid-pattern-background h-full px-8">
//         <ConnectionStatus
//           isConnected={isConnected}
//           isResuming={isResuming}
//           onRetry={handleRetryConnection}
//         />

//         <div className="h-full flex flex-col py-4 max-w-2xl mx-auto w-full pb-[calc(var(--search-height)+3rem)]">
//           {!isAuthenticated && ( // Guest disclaimer
//             <div className="w-full text-center text-sm text-foreground-muted mb-6">
//               You are viewing a shared conversation. Sign in to fork it and
//               continue chatting.
//             </div>
//           )}
//           {isAuthenticated && ( // Fork button for authenticated users
//             <div className="w-full flex justify-center mb-6">
//               <Button
//                 onClick={() => {
//                   /* Consider if a separate button click should also trigger fork, or just reprompt */
//                 }}
//                 disabled={forkConversationMutation.isPending}
//               >
//                 {forkConversationMutation.isPending
//                   ? "Forking..."
//                   : "Fork Conversation"}
//                 <Share2 className="ml-2 h-4 w-4" />
//               </Button>
//             </div>
//           )}

//           <div className="flex flex-col gap-12">
//             {conversation?.messages.map((message, index) => (
//               <div
//                 key={message.id}
//                 ref={
//                   index === (conversation?.messages.length || 0) - 1
//                     ? lastMessageRef
//                     : undefined
//                 }
//                 data-role={message.role}
//               >
//                 <ChatMessage
//                   status={status}
//                   message={message}
//                   currentModel={selectedModel}
//                   onRetry={handleReload}
//                   onModelChange={setSelectedModel}
//                   addToolResult={addToolResult}
//                 />
//               </div>
//             ))}

//             {status === "submitted" && (
//               <div className="flex items-center gap-1 mb-2">
//                 <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
//                 <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-75" />
//                 <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-150" />
//               </div>
//             )}
//             <div ref={messagesEndRef} />

//             {temporarySpaceHeight > 0 && (
//               <div
//                 style={{ height: `${temporarySpaceHeight}px` }}
//                 className="pointer-events-none"
//                 aria-hidden="true"
//               />
//             )}
//           </div>
//         </div>

//         <div className="max-md:max-w-2xl max-md:w-full md:w-[min(42rem,_calc(100vw_-_var(--sidebar-width)_-_2rem))] fixed bottom-6 left-2/4 md:left-[calc((100vw+var(--sidebar-width))/2)] -translate-x-1/2">
//           <ChatInput
//             onSubmit={handleRepromptAndFork}
//             onImageAttach={handleImageAttach}
//             selectedModel={selectedModel}
//             onModelChange={setSelectedModel}
//             disabled={
//               status === "streaming" ||
//               status === "submitted" ||
//               !isAuthenticated
//             }
//             className="flex-1"
//             onStop={handleStop}
//             isGuest={isChatSessionGuest}
//             remainingMessages={remainingMessages}
//             totalMessages={totalMessages}
//             maxMessages={maxMessages}
//           />
//         </div>
//       </div>

//       <ErrorAlert
//         isOpen={alertState.isOpen}
//         onClose={hideAlert}
//         title={alertState.title}
//         message={alertState.message}
//         type={alertState.type}
//         onResume={reload}
//         showResume={
//           status === "error" && alertState.title === "Streaming Error"
//         }
//         resetTimer={alertState.resetTimer}
//       />
//     </>
//   );
// }
