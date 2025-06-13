import { useEffect, useRef, useCallback } from "react";

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
}

export function useAutoScroll(options: UseAutoScrollOptions = {}) {
  const {
    topbarHeight = 64,
    maxQuestionLines = 3,
    lineHeight = 24,
    smooth = true,
  } = options;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  // Scroll to the end of messages (for regular scrolling)
  const scrollToEnd = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "instant",
    });
  }, [smooth]);

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

        // If question is too long, scroll it partially out of view
        if (questionHeight > maxQuestionHeight) {
          const scrollOffset =
            questionHeight - lineHeight + actualTopbarHeight + 16;

          window.scrollTo({
            top: messageElement.offsetTop - scrollOffset,
            behavior: smooth ? "smooth" : "instant",
          });
        } else {
          // Normal scroll to top with topbar offset
          window.scrollTo({
            top: messageElement.offsetTop - actualTopbarHeight - 16,
            behavior: smooth ? "smooth" : "instant",
          });
        }
      } else {
        // Fallback: scroll to message top with topbar offset
        window.scrollTo({
          top: messageElement.offsetTop - actualTopbarHeight - 16,
          behavior: smooth ? "smooth" : "instant",
        });
      }
    },
    [topbarHeight, maxQuestionLines, lineHeight, smooth]
  );

  // Auto-scroll effect for new messages
  const handleNewMessage = useCallback(
    (isNewUserMessage = false) => {
      if (isNewUserMessage) {
        setTimeout(() => {
          scrollMessageToTop();
        }, 100); // Small delay to ensure DOM is updated
      } else {
        // For assistant responses, scroll to end
        setTimeout(() => {
          scrollToEnd();
        }, 100);
      }
    },
    [scrollMessageToTop, scrollToEnd]
  );

  return {
    messagesEndRef,
    lastMessageRef,
    scrollToEnd,
    scrollMessageToTop,
    handleNewMessage,
  };
}
