import * as React from "react";
import { memo } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SuggestionCardProps {
  title: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  className?: React.HTMLAttributes<HTMLDivElement>["className"];
}

export const SuggestionCard = memo(function SuggestionCard({
  title,
  icon: Icon,
  onClick,
  disabled,
  className,
}: SuggestionCardProps) {
  return (
    <Button
      variant="outline"
      className={cn(
        "h-auto p-4 text-left justify-start group transition-all duration-200",
        "hover:border-primary/20 hover:bg-primary/10",
        "focus-visible:border-primary/30 focus-visible:bg-primary/10",
        className
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <div className="flex items-center gap-3 w-full">
        <div className="flex-shrink-0 p-2 rounded-lg bg-surface-secondary group-hover:bg-primary/10 transition-colors">
          <Icon className="w-4 h-4 text-foreground-subtle group-hover:text-primary transition-colors" />
        </div>
        <span className="text-sm font-medium text-foreground-default group-hover:text-foreground-default">
          {title}
        </span>
      </div>
    </Button>
  );
},
areEqual);

function areEqual(
  prev: SuggestionCardProps,
  next: SuggestionCardProps
): boolean {
  return prev.title === next.title && prev.disabled === next.disabled;
}
