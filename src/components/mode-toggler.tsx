"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import {
  motion,
  AnimatePresence,
  useMotionTemplate,
  useSpring,
} from "framer-motion";
import { Button } from "./ui/button";

export function ModeToggler() {
  const { setTheme, theme, resolvedTheme } = useTheme();

  const containerRef = React.useRef<HTMLDivElement>(null);
  const lightRef = React.useRef<HTMLButtonElement>(null);
  const systemRef = React.useRef<HTMLButtonElement>(null);
  const darkRef = React.useRef<HTMLButtonElement>(null);

  const springConfig = {
    stiffness: 300,
    damping: 30,
  };

  const clipLeft = useSpring(0, springConfig);
  const clipRight = useSpring(66, springConfig);
  const motionClipPath = useMotionTemplate`inset(0 ${clipRight}% 0 ${clipLeft}% round 1.5rem)`;

  const getCurrentRef = () => {
    const current =
      theme === "system" ? systemRef : theme === "dark" ? darkRef : lightRef;
    return current.current;
  };

  React.useLayoutEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const activeButton = getCurrentRef();

    if (activeButton) {
      const containerRect = container.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();

      const leftPercent =
        ((buttonRect.left - containerRect.left) / containerRect.width) * 100;
      const rightPercent =
        100 -
        ((buttonRect.right - containerRect.left) / containerRect.width) * 100;

      clipLeft.set(Math.max(0, Math.floor(leftPercent)));
      clipRight.set(Math.max(0, Math.floor(rightPercent)));
    }
  }, [theme, resolvedTheme]);

  const filterId = `bg-filter-${resolvedTheme}`;

  return (
    <div className="rounded-3xl bg-surface-secondary p-1 shadow-md border border-subtle overflow-hidden">
      <AnimatePresence>
        <motion.svg
          key={resolvedTheme}
          width="0"
          height="0"
          className="absolute inset-0 w-full h-full z-30 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <defs>
            <filter id={filterId}>
              <feTurbulence
                type="fractalNoise"
                baseFrequency={resolvedTheme === "dark" ? "0.6 0.9" : "0.4 0.7"}
                numOctaves="3"
                seed={resolvedTheme === "dark" ? 10 : 5}
                stitchTiles="stitch"
              />
              <feDisplacementMap
                in="SourceGraphic"
                scale={resolvedTheme === "dark" ? 15 : 10}
              />
            </filter>
          </defs>
          <rect
            width="100%"
            height="100%"
            filter={`url(#${filterId})`}
            className="fill-surface-secondary opacity-50 dark:opacity-30"
          />
        </motion.svg>
      </AnimatePresence>

      <div
        ref={containerRef}
        className="relative flex items-center rounded-3xl bg-surface-secondary shadow-md border border-subtle"
      >
        <motion.div
          className="flex items-center justify-between absolute inset-0 bg-primary z-10"
          style={{
            clipPath: motionClipPath,
            WebkitClipPath: motionClipPath,
          }}
        >
          <span className="flex-1 inline-flex justify-center items-center size-7">
            <Sun className="w-4 h-4 text-foreground-default" />
          </span>
          <span className="flex-1 inline-flex justify-center items-center size-7">
            <Monitor className="w-4 h-4 text-foreground-default" />
          </span>
          <span className="flex-1 inline-flex justify-center items-center size-7">
            <Moon className="w-4 h-4 text-foreground-default" />
          </span>
        </motion.div>

        <div className="flex items-center justify-between w-full">
          <Button
            ref={lightRef}
            variant="themeToggle"
            onClick={() => setTheme("light")}
            aria-label="Switch to light mode"
            className="flex-1 size-7"
          >
            <Sun className="w-4 h-4" />
          </Button>

          <Button
            ref={systemRef}
            variant="themeToggle"
            onClick={() => setTheme("system")}
            aria-label="Switch to system theme"
            className="flex-1 size-7"
          >
            <Monitor className="w-4 h-4" />
          </Button>

          <Button
            ref={darkRef}
            variant="themeToggle"
            onClick={() => setTheme("dark")}
            aria-label="Switch to dark mode"
            className="flex-1 size-7"
          >
            <Moon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
