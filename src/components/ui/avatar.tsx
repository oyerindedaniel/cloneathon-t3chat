"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "@/lib/utils";
import { GridCross } from "./grid-cross";

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        "ring-2 ring-default/20 hover:ring-primary/30 transition-all duration-200",
        "auth-surface border border-default/50",
        className
      )}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full relative",
        "bg-gradient-to-br from-primary/10 to-provider-openai/10",
        "text-foreground-default font-medium text-sm",
        "border border-default/20",
        className
      )}
      {...props}
    >
      {children}
      <GridCross
        position="relative"
        size="sm"
        opacity={0.15}
        className="absolute top-0 right-0"
        style={{ transform: "scale(0.3) translate(50%, -50%)" }}
      />
    </AvatarPrimitive.Fallback>
  );
}

export { Avatar, AvatarImage, AvatarFallback };
