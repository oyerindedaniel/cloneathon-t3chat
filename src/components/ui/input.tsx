import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground-default placeholder:text-foreground-muted selection:bg-primary selection:text-foreground-on-accent bg-surface-primary border-default flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm text-foreground-default",
        "focus-visible:border-primary focus-visible:ring-primary/50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-primary",
        "aria-invalid:ring-error/50 aria-invalid:border-error",
        className
      )}
      {...props}
    />
  );
}

export { Input };
