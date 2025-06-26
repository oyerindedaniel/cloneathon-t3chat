import { cn } from "@/lib/utils";

interface TypingDotsProps {
  className?: React.HTMLAttributes<HTMLDivElement>["className"];
}

export function TypingDots({ className }: TypingDotsProps) {
  return (
    <div className={cn("flex items-center gap-1 mb-2", className)}>
      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
      <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-150" />
      <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-300" />
    </div>
  );
}
