import { useRef, useCallback, useEffect, RefObject } from "react";

export function useAutosizeTextArea(
  maxHeight: number = 200
): [RefObject<HTMLTextAreaElement | null>, () => void] {
  const ref = useRef<HTMLTextAreaElement>(null);
  const frame = useRef<number | undefined>(undefined);
  const initialHeight = useRef<number | null>(null);

  const resize = useCallback(() => {
    frame.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;

      const value = el.value?.trim();

      if (initialHeight.current === null) {
        initialHeight.current = el.offsetHeight;
      }

      if (!value) {
        el.style.height = `${initialHeight.current}px`;
        el.style.overflowY = "hidden";
        return;
      }

      el.style.height = "auto";
      const height = Math.min(el.scrollHeight, maxHeight);
      el.style.height = `${height}px`;
      el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
    });
  }, [maxHeight]);

  useEffect(() => {
    resize();
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [resize]);

  return [ref, resize];
}
