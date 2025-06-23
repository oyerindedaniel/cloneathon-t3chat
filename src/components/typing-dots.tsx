export function TypingDots() {
  return (
    <div className="flex items-center gap-1 mb-2">
      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
      <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-150" />
      <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-300" />
    </div>
  );
}
