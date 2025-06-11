"use client";

import { cn } from "@/lib/utils";

interface GridCrossProps {
  className?: string;
  position?: "tl" | "tr" | "bl" | "br" | "center" | "relative";
  size?: "sm" | "md" | "lg";
  opacity?: number;
  style?: React.CSSProperties;
}

export function GridCross({
  className,
  position = "relative",
  size = "md",
  opacity,
  style,
  ...props
}: GridCrossProps) {
  const getPositionClasses = () => {
    switch (position) {
      case "tl":
        return "auth-cross-tl";
      case "tr":
        return "auth-cross-tr";
      case "bl":
        return "auth-cross-bl";
      case "br":
        return "auth-cross-br";
      case "center":
        return "auth-cross-center";
      default:
        return "";
    }
  };

  const getSizeTransform = () => {
    switch (size) {
      case "sm":
        return "scale(0.6)";
      case "lg":
        return "scale(1.2)";
      default:
        return "scale(1)";
    }
  };

  const combinedStyle = {
    transform: getSizeTransform(),
    opacity: opacity !== undefined ? opacity : undefined,
    ...style,
  };

  return (
    <div
      className={cn("grid-cross", getPositionClasses(), className)}
      style={combinedStyle}
      {...props}
    />
  );
}
