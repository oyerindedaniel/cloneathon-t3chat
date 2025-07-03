import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";

interface TypingDotsProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const dotVariants = cva("rounded-full bg-primary animate-bounce", {
  variants: {
    size: {
      sm: "w-1.5 h-1.5",
      md: "w-2 h-2",
      lg: "w-3 h-3",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export function TypingDots({ className, size = "md" }: TypingDotsProps) {
  return (
    <div className={cn("flex items-center gap-1 mb-2", className)}>
      <div className={dotVariants({ size })} />
      <div className={cn(dotVariants({ size }), "delay-150")} />
      <div className={cn(dotVariants({ size }), "delay-300")} />
    </div>
  );
}
