import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-default placeholder:text-foreground-muted bg-surface-primary text-foreground-default flex field-sizing-content min-h-16 w-full rounded-md border px-3 py-2 text-base transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-primary focus-visible:ring-primary/50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-primary",
        "aria-invalid:ring-error/50 aria-invalid:border-error",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
