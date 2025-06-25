import { useEffect, useRef, useCallback, useState } from "react";
import { UseChatHelpers } from "@ai-sdk/react";
import { useChatControls } from "@/contexts/chat-context";

interface UseAutoScrollOptions {
  /**
   * Height of the search bar to account for when scrolling
   * Defaults to CSS variable --search-height or 64px
   */
  searchBarHeight?: number;
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
   * AI status
   */
  status: UseChatHelpers["status"];
}

/**
 * Gets the total offset of an element from the top of the document.
 */
function getOffsetTopFromPage(el: HTMLElement): number {
  let totalOffset = 0;
  let current: HTMLElement | null = el;

  while (current) {
    totalOffset += current.offsetTop;
    current = current.offsetParent as HTMLElement;
  }

  return totalOffset;
}

export function useAutoScroll(options: UseAutoScrollOptions) {
  const {
    searchBarHeight = 96,
    topbarHeight = 64,
    maxQuestionLines = 3,
    lineHeight = 24,
    smooth = true,
    messages = [],
    status = "ready",
  } = options;

  const { currentConversationId } = useChatControls();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const [temporarySpaceHeight, setTemporarySpaceHeight] = useState(0);
  const prevMessagesLength = useRef(messages.length);

  const behavior = smooth ? "smooth" : "instant";

  const calculateOffset = useCallback(() => {
    const topbar =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--topbar-height"
        )
      ) * 16 || topbarHeight;
    const searchbar =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--search-height"
        )
      ) * 16 || searchBarHeight;
    const padding = 24;
    return { topbar, searchbar, padding };
  }, []);

  /**
   * Scrolls an element to the top of the viewport with optional offset.
   * Used to align message with topbar visibility.
   */
  const scrollToTopWithOffset = useCallback((el: HTMLElement, offset = 0) => {
    const top = getOffsetTopFromPage(el) - offset;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  /**
   * Scrolls an element to the bottom of the viewport, accounting for fixed search bar and padding.
   * Used to make the end of assistant's message fully visible.
   */
  const scrollToBottomWithOffset = useCallback(
    (el: HTMLElement, offset = 0) => {
      const bottom =
        getOffsetTopFromPage(el) +
        el.offsetHeight -
        window.innerHeight +
        offset;
      window.scrollTo({ top: bottom, behavior: "smooth" });
    },
    []
  );

  /**
   * Scrolls the assistant message to the top of the viewport with topbar offset.
   * Typically used when resuming a stream on reload.
   */
  const scrollToAssistantMessageTop = useCallback(() => {
    const el = lastMessageRef.current;
    if (!el) return;
    const { topbar, padding } = calculateOffset();
    scrollToTopWithOffset(el, topbar + padding);
  }, [lastMessageRef, calculateOffset, scrollToTopWithOffset]);

  /**
   * Scrolls the assistant message to the bottom of the viewport considering search bar height.
   * Ensures bottom of long assistant responses are shown fully.
   */
  const scrollToAssistantMessageBottom = useCallback(() => {
    const el = lastMessageRef.current;
    if (!el) return;
    const { searchbar, padding, topbar } = calculateOffset();
    scrollToBottomWithOffset(el, searchbar + topbar + padding);
  }, [lastMessageRef, calculateOffset, scrollToBottomWithOffset]);

  const scrollToEndIfRoomAvailable = useCallback(() => {
    const lastEl = lastMessageRef.current;
    if (!lastEl) return;

    const { topbar, searchbar, padding } = calculateOffset();
    const availableHeight =
      window.innerHeight - topbar - searchbar - padding * 2;
    const heightFromLast = getOffsetTopFromPage(lastEl) + lastEl.offsetHeight;

    if (heightFromLast <= window.scrollY + availableHeight) {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
  }, [lastMessageRef, messagesEndRef, behavior, calculateOffset]);

  /**
   * Scrolls the last message to the bottom of the viewport
   * if it's not already fully visible, accounting for fixed UI like
   * search bar and padding.
   */
  const scrollToEnd = useCallback(() => {
    const el = lastMessageRef.current;
    if (!el) return;

    const { searchbar, padding, topbar } = calculateOffset();
    const offset = searchbar + topbar + padding * 2;

    const messageBottom = getOffsetTopFromPage(el) + el.offsetHeight;
    const viewportBottom = window.scrollY + window.innerHeight - offset;

    // Only scroll if the bottom of the message is below the visible area
    if (messageBottom > viewportBottom) {
      const scrollY = messageBottom - window.innerHeight + offset;

      window.scrollTo({
        top: scrollY,
        behavior,
      });
    }
  }, [lastMessageRef, calculateOffset, behavior]);

  // Create temporary space to allow scrolling
  const createTemporarySpace = useCallback((requiredSpace: number) => {
    setTemporarySpaceHeight(requiredSpace);
  }, []);

  const scrollMessageToTop = useCallback(
    (messageElement?: HTMLElement) => {
      messageElement = messageElement || lastMessageRef.current || undefined;
      if (!messageElement) return;

      const { topbar, padding } = calculateOffset();

      const questionElement = messageElement;
      const questionHeight = questionElement.offsetHeight;
      const maxQuestionHeight = maxQuestionLines * lineHeight;

      const messageOffsetTop = getOffsetTopFromPage(messageElement);
      const viewportHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      let targetScrollTop;

      if (questionHeight > maxQuestionHeight) {
        // For long questions: scroll to show only the last part
        targetScrollTop =
          messageOffsetTop +
          questionHeight -
          maxQuestionHeight -
          topbar -
          padding;
      } else {
        // For short questions: scroll to show the top just below the topbar
        targetScrollTop = messageOffsetTop - topbar - padding;
      }

      const maxScrollable = documentHeight - viewportHeight;

      let requiredSpace = 0;
      if (targetScrollTop > maxScrollable) {
        requiredSpace = targetScrollTop - maxScrollable;

        createTemporarySpace(requiredSpace);
      }

      setTimeout(() => {
        const clampedScrollTop = Math.min(
          targetScrollTop,
          document.documentElement.scrollHeight - window.innerHeight
        );
        window.scrollTo({
          top: clampedScrollTop,
          behavior,
        });
      }, 50);
    },
    [
      topbarHeight,
      maxQuestionLines,
      lineHeight,
      behavior,
      createTemporarySpace,
      calculateOffset,
    ]
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
    [scrollMessageToTop]
  );

  // Handle auto-scroll for new messages when messages array changes
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      const lastMessage = messages.at(-1);
      const isNewUserMessage = lastMessage?.role === "user";
      const isNewAssistantMessage = lastMessage?.role === "assistant";

      if (isNewUserMessage) {
        handleNewMessage(isNewUserMessage);
      } else if (isNewAssistantMessage && status === "ready") {
        handleNewMessage();
      }

      prevMessagesLength.current = messages.length;
    }
  }, [messages, handleNewMessage, status]);

  useEffect(() => {
    prevMessagesLength.current = 0;
    setTemporarySpaceHeight(0);
    setTimeout(() => {
      scrollToEnd();
    }, 100);
  }, [currentConversationId]);

  return {
    messagesEndRef,
    lastMessageRef,
    scrollMessageToTop,
    scrollToEnd,
    scrollToEndIfRoomAvailable,
    scrollToAssistantMessageBottom,
    handleNewMessage,
    temporarySpaceHeight,
  };
}
