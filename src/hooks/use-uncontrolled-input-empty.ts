import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Hook to track whether an uncontrolled input is empty and provide form submission capabilities.
 * It only triggers a rerender when the "empty" state changes, preventing excessive re-renders.
 *
 * @returns A tuple: [ref to attach to input, boolean isEmpty, getCurrentValue function, handleSubmit function, updateState function]
 */
export function useUncontrolledInputEmpty(): [
  React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
  boolean,
  () => string,
  (onSubmit: (value: string) => void) => void,
  () => void
] {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const updateState = useCallback(() => {
    const current = inputRef.current;
    const value = current?.value ?? "";
    setIsEmpty((prev) => {
      const next = value.trim() === "";
      return prev !== next ? next : prev;
    });
  }, []);

  const getCurrentValue = useCallback(() => {
    return inputRef.current?.value ?? "";
  }, []);

  const handleSubmit = useCallback(
    (onSubmit: (value: string) => void) => {
      const current = inputRef.current;
      if (!current) return;

      const value = current.value.trim();
      if (value) {
        onSubmit(value);
        current.value = "";
        updateState();
      }
    },
    [updateState]
  );

  useEffect(() => {
    const node = inputRef.current;
    if (!node) return;

    updateState();
    const handleInput = () => updateState();

    node.addEventListener("input", handleInput);
    return () => node.removeEventListener("input", handleInput);
  }, [updateState]);

  return [inputRef, isEmpty, getCurrentValue, handleSubmit, updateState];
}
