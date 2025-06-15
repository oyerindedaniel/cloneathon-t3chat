import { useEffect, useRef, useCallback, useState } from "react";

interface UseAutoScrollOptions {
  /**
   * Height of the topbar to account for when scrolling
   * Defaults to CSS variable --topbar-height or 64px
   */
  topbarHeight?: number;
  /**
   * Maximum number of lines for a question before it gets scrolled out of view
   * Defaults to 3 lines
   */
  maxQuestionLines?: number;
  /**
   * Estimated line height for calculating question height
   * Defaults to 24px (1.5rem)
   */
  lineHeight?: number;
  /**
   * Smooth scroll behavior
   * Defaults to true
   */
  smooth?: boolean;
  /**
   * Messages array to track for auto-scrolling
   */
  messages?: Array<{ role: string; [key: string]: any }>;
  /**
   * Whether AI is currently streaming a response
   */
  isStreaming?: boolean;
}

export function useAutoScroll(options: UseAutoScrollOptions = {}) {
  const {
    topbarHeight = 64,
    maxQuestionLines = 3,
    lineHeight = 24,
    smooth = true,
    messages = [],
    isStreaming = false,
  } = options;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const [temporarySpaceHeight, setTemporarySpaceHeight] = useState(0);
  const prevMessagesLength = useRef(messages.length);
  const spaceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to the end of messages (for regular scrolling)
  const scrollToEnd = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "instant",
    });
  }, [smooth]);

  // Create temporary space to allow scrolling
  const createTemporarySpace = useCallback((requiredSpace: number) => {
    setTemporarySpaceHeight(requiredSpace);
    // Don't auto-remove the space - it will be recalculated on next message
  }, []);

  // Recalculate temporary space when messages change instead of removing it
  useEffect(() => {
    if (messages.length > 0 && temporarySpaceHeight > 0) {
      // Recalculate space based on current layout
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === "assistant") {
        // Keep the space for assistant messages to prevent jumping
        return;
      }
    }
  }, [messages, temporarySpaceHeight]);

  // Scroll new message to top with topbar offset
  const scrollMessageToTop = useCallback(
    (messageElement?: HTMLElement) => {
      if (!messageElement) {
        messageElement = lastMessageRef.current || undefined;
      }

      if (!messageElement) return;

      const actualTopbarHeight =
        parseInt(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--topbar-height"
          )
        ) || topbarHeight;

      const questionElement = messageElement.querySelector(
        '[data-role="user"]'
      ) as HTMLElement;

      if (questionElement) {
        const questionHeight = questionElement.offsetHeight;
        const maxQuestionHeight = maxQuestionLines * lineHeight;

        // Calculate how much space we need to scroll properly
        const viewportHeight = window.innerHeight;
        const messageTop = messageElement.offsetTop;
        const documentHeight = document.documentElement.scrollHeight;

        // Calculate required space for scrolling
        let requiredSpace = 0;

        if (questionHeight > maxQuestionHeight) {
          // For long questions, we need space to scroll most of it out of view
          const scrollOffset =
            questionHeight - lineHeight + actualTopbarHeight + 16;
          const targetScrollTop = messageTop - scrollOffset;

          if (targetScrollTop > documentHeight - viewportHeight) {
            requiredSpace =
              targetScrollTop - (documentHeight - viewportHeight) + 100; // Extra buffer
          }
        } else {
          // For normal questions, we need space to scroll to top with topbar offset
          const targetScrollTop = messageTop - actualTopbarHeight - 16;

          if (targetScrollTop > documentHeight - viewportHeight) {
            requiredSpace =
              targetScrollTop - (documentHeight - viewportHeight) + 100; // Extra buffer
          }
        }

        // Create temporary space if needed
        if (requiredSpace > 0) {
          createTemporarySpace(requiredSpace);
        }

        // Perform the scroll after a brief delay to allow space creation
        setTimeout(() => {
          if (questionHeight > maxQuestionHeight) {
            const scrollOffset =
              questionHeight - lineHeight + actualTopbarHeight + 16;

            window.scrollTo({
              top: messageElement.offsetTop - scrollOffset,
              behavior: smooth ? "smooth" : "instant",
            });
          } else {
            window.scrollTo({
              top: messageElement.offsetTop - actualTopbarHeight - 16,
              behavior: smooth ? "smooth" : "instant",
            });
          }
        }, 50); // Small delay to ensure space is created
      } else {
        // Fallback: scroll to message top with topbar offset
        const messageTop = messageElement.offsetTop;
        const targetScrollTop = messageTop - actualTopbarHeight - 16;
        const documentHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;

        if (targetScrollTop > documentHeight - viewportHeight) {
          const requiredSpace =
            targetScrollTop - (documentHeight - viewportHeight) + 100;
          createTemporarySpace(requiredSpace);
        }

        setTimeout(() => {
          window.scrollTo({
            top: targetScrollTop,
            behavior: smooth ? "smooth" : "instant",
          });
        }, 50);
      }
    },
    [topbarHeight, maxQuestionLines, lineHeight, smooth, createTemporarySpace]
  );

  // Auto-scroll effect for new messages
  const handleNewMessage = useCallback(
    (isNewUserMessage = false) => {
      if (isNewUserMessage) {
        setTimeout(() => {
          scrollMessageToTop();
        }, 100); // Small delay to ensure DOM is updated
      } else {
        setTimeout(() => {
          scrollToEnd();
        }, 100);
      }
    },
    [scrollMessageToTop, scrollToEnd]
  );

  // Handle auto-scroll for new messages when messages array changes
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      const lastMessage = messages[messages.length - 1];
      const isNewUserMessage = lastMessage?.role === "user";

      handleNewMessage(isNewUserMessage);

      prevMessagesLength.current = messages.length;
    }
  }, [messages, handleNewMessage]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (spaceTimeoutRef.current) {
        clearTimeout(spaceTimeoutRef.current);
      }
    };
  }, []);

  return {
    messagesEndRef,
    lastMessageRef,
    scrollToEnd,
    scrollMessageToTop,
    handleNewMessage,
    temporarySpaceHeight,
  };
}
