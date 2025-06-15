import { useState, useRef, useEffect } from "react";
import {
  motion,
  useMotionTemplate,
  useSpring,
  AnimatePresence,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AVAILABLE_MODELS } from "@/lib/ai/models";
import { ChevronDown, Search, Loader2 } from "lucide-react";
import { usePremiumModelHandler } from "@/hooks/use-premium-model-handler";

interface ModelSwitcherProps {
  currentModel: string;
  onModelChange: (modelId: string) => void;
  className?: React.HTMLAttributes<HTMLDivElement>["className"];
}

function ModelSwitcherSkeleton() {
  return (
    <div className="flex items-center justify-between w-full px-3 py-2 text-xs rounded-md animate-pulse">
      <div className="flex flex-col items-start">
        <div className="h-3 bg-surface-secondary rounded w-20 mb-1" />
        <div className="h-2 bg-surface-secondary rounded w-16" />
      </div>
      <div className="w-8 h-3 bg-surface-secondary rounded" />
    </div>
  );
}

export function ModelSwitcher({
  currentModel,
  onModelChange,
  className,
}: ModelSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAllModels, setShowAllModels] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const { isCheckingApiKey, handlePremiumModelSelect, getPremiumModelStatus } =
    usePremiumModelHandler();

  const springConfig = {
    stiffness: 300,
    damping: 30,
  };

  const clipLeft = useSpring(0, springConfig);
  const clipRight = useSpring(100, springConfig);
  const motionClipPath = useMotionTemplate`inset(0 ${clipRight}% 0 ${clipLeft}% round 0.75rem)`;

  const quickModels = AVAILABLE_MODELS.filter((model) => model.free).slice(
    0,
    3
  );
  const currentModelData = AVAILABLE_MODELS.find((m) => m.id === currentModel);

  const filteredModels = AVAILABLE_MODELS.filter(
    (model) =>
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (!containerRef.current || !isOpen || showAllModels) return;

    const container = containerRef.current;
    const activeButton = container.querySelector(
      `[data-model="${currentModel}"]`
    ) as HTMLElement;

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
  }, [currentModel, isOpen, showAllModels, clipLeft, clipRight]);

  const handleModelSelect = (modelId: string) => {
    const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
    if (!model) return;

    const success = handlePremiumModelSelect(model, (selectedModelId) => {
      onModelChange(selectedModelId);
      setIsOpen(false);
      setShowAllModels(false);
      setSearchQuery("");
    });

    if (!success) {
      setIsOpen(false);
      setShowAllModels(false);
      setSearchQuery("");
    }
  };

  const handleViewAllModels = () => {
    setShowAllModels(true);
  };

  const handleBackToQuick = () => {
    setShowAllModels(false);
    setSearchQuery("");
  };

  return (
    <div className={cn("relative", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-foreground-subtle hover:text-foreground-default hover:bg-surface-hover"
          >
            <span className="max-w-[120px] truncate">
              {currentModelData?.name || currentModel}
            </span>
            <ChevronDown className="w-3 h-3 ml-1" />
            {isCheckingApiKey && (
              <Loader2 className="w-3 h-3 ml-1 animate-spin" />
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-auto p-0 border border-subtle bg-surface-primary/95 backdrop-blur-sm shadow-lg"
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <AnimatePresence mode="wait">
            {!showAllModels ? (
              <motion.div
                key="quick-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="p-2 min-w-[200px]"
              >
                <div className="flex items-center gap-2 text-xs font-medium text-foreground-muted px-2 py-1 mb-1">
                  <span>Quick Switch</span>
                  {isCheckingApiKey && (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  )}
                </div>

                <div
                  ref={containerRef}
                  className="relative rounded-lg bg-surface-secondary/50 p-1 overflow-hidden"
                >
                  <motion.div
                    className="absolute inset-0 bg-primary z-10 rounded-md"
                    style={{
                      clipPath: motionClipPath,
                      WebkitClipPath: motionClipPath,
                    }}
                  />

                  <div className="relative z-20 flex flex-col gap-1">
                    {isCheckingApiKey
                      ? Array.from({ length: 3 }).map((_, i) => (
                          <ModelSwitcherSkeleton key={i} />
                        ))
                      : quickModels.map((model) => (
                          <button
                            key={model.id}
                            data-model={model.id}
                            onClick={() => handleModelSelect(model.id)}
                            className={cn(
                              "flex items-center justify-between w-full px-3 py-2 text-xs rounded-md transition-colors",
                              "hover:bg-surface-hover",
                              currentModel === model.id
                                ? "text-foreground-on-accent"
                                : "text-foreground-default"
                            )}
                          >
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{model.name}</span>
                              <span className="text-[10px] opacity-70">
                                {model.provider}
                              </span>
                            </div>
                            {model.free && (
                              <Badge
                                variant="success"
                                className="text-[10px] px-1.5 py-0.5"
                              >
                                Free
                              </Badge>
                            )}
                          </button>
                        ))}
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-subtle">
                  <button
                    onClick={handleViewAllModels}
                    className="w-full px-2 py-1.5 text-xs text-foreground-subtle hover:text-foreground-default hover:bg-surface-hover rounded-md transition-colors"
                  >
                    View all models...
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="all-models"
                initial={{ opacity: 0, height: 200 }}
                animate={{ opacity: 1, height: 400 }}
                exit={{ opacity: 0, height: 200 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="p-2 w-[320px] overflow-hidden"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-foreground-muted">
                    <span>All Models ({filteredModels.length})</span>
                    {isCheckingApiKey && (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    )}
                  </div>
                  <button
                    onClick={handleBackToQuick}
                    className="text-xs text-foreground-subtle hover:text-foreground-default px-2 py-1 rounded-md hover:bg-surface-hover transition-colors"
                  >
                    Back
                  </button>
                </div>

                <div className="relative mb-2">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-foreground-muted" />
                  <input
                    type="text"
                    placeholder="Search models..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 text-xs bg-surface-secondary border border-subtle rounded-md text-foreground-default placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="overflow-y-auto max-h-[300px] space-y-1">
                  {isCheckingApiKey
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <ModelSwitcherSkeleton key={i} />
                      ))
                    : filteredModels.map((model) => {
                        const status = getPremiumModelStatus(model);
                        return (
                          <button
                            key={model.id}
                            onClick={() => handleModelSelect(model.id)}
                            className={cn(
                              "flex items-center justify-between w-full px-3 py-2 text-xs rounded-md transition-colors hover:bg-surface-hover",
                              status.needsApiKey && "opacity-60",
                              currentModel === model.id
                                ? "bg-primary/10 text-primary"
                                : "text-foreground-default"
                            )}
                          >
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{model.name}</span>
                              <span className="text-[10px] opacity-70">
                                {model.provider}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {model.free ? (
                                <Badge
                                  variant="success"
                                  className="text-[10px] px-1.5 py-0.5"
                                >
                                  Free
                                </Badge>
                              ) : (
                                <Badge
                                  variant="warning"
                                  className="text-[10px] px-1.5 py-0.5"
                                >
                                  Premium
                                </Badge>
                              )}
                              {currentModel === model.id && (
                                <div className="w-2 h-2 rounded-full bg-primary" />
                              )}
                              {status.needsApiKey && (
                                <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                </div>

                {!isCheckingApiKey && filteredModels.length === 0 && (
                  <div className="text-center py-8 text-foreground-muted text-xs">
                    No models found matching "{searchQuery}"
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </PopoverContent>
      </Popover>
    </div>
  );
}
