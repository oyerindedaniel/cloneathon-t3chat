"use client";

import * as React from "react";
import {
  ChevronDown,
  Cpu,
  Zap,
  Eye,
  Globe,
  Code,
  Sparkles,
  Crown,
  Gift,
  Search,
  ArrowLeft,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import {
  AIModel,
  getModelById,
  getFreeModels,
  getPremiumModels,
  AVAILABLE_MODELS,
} from "@/lib/ai/models";
import { usePremiumModelHandler } from "@/hooks/use-premium-model-handler";

interface ModelSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  variant?: "compact" | "full";
}

function getProviderIcon(provider: string) {
  switch (provider.toLowerCase()) {
    case "openai":
      return <Sparkles className="w-4 h-4" />;
    case "anthropic":
      return <Cpu className="w-4 h-4" />;
    case "google":
      return <Globe className="w-4 h-4" />;
    case "meta":
      return <Code className="w-4 h-4" />;
    case "microsoft":
      return <Zap className="w-4 h-4" />;
    case "alibaba":
      return <Globe className="w-4 h-4" />;
    case "hugging face":
      return <Code className="w-4 h-4" />;
    default:
      return <Cpu className="w-4 h-4" />;
  }
}

function getCapabilityIcon(capability: string) {
  switch (capability.toLowerCase()) {
    case "image input":
      return <Eye className="w-3 h-3" />;
    case "object generation":
      return <Sparkles className="w-3 h-3" />;
    case "tool usage":
      return <Code className="w-3 h-3" />;
    case "tool streaming":
      return <Zap className="w-3 h-3" />;
    default:
      return null;
  }
}

function ModelItemSkeleton() {
  return (
    <div className="w-full p-2 rounded-md animate-pulse">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-4 h-4 bg-surface-secondary rounded" />
        <div className="h-4 bg-surface-secondary rounded flex-1" />
        <div className="w-16 h-4 bg-surface-secondary rounded" />
      </div>
      <div className="h-3 bg-surface-secondary rounded w-3/4" />
    </div>
  );
}

export function ModelSelector({
  value,
  onValueChange,
  disabled,
  variant = "full",
}: ModelSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [hoveredModel, setHoveredModel] = React.useState<AIModel | null>(null);
  const [showAllModels, setShowAllModels] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [expandedPremium, setExpandedPremium] = React.useState(false);

  const {
    hasOpenRouterKey,
    isCheckingApiKey,
    handlePremiumModelSelect,
    getPremiumModelStatus,
  } = usePremiumModelHandler();

  const freeModels = getFreeModels();
  const premiumModels = getPremiumModels();

  const defaultModel = React.useMemo(() => {
    if (value) return value;
    const recommendedModel = AVAILABLE_MODELS.find(
      (model) => model.recommended && model.free
    );
    return recommendedModel?.id || AVAILABLE_MODELS[0]?.id || "";
  }, [value]);

  const currentValue = value || defaultModel;
  const selectedModelData = getModelById(currentValue);

  const filteredModels = AVAILABLE_MODELS.filter(
    (model) =>
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayModel = hoveredModel || selectedModelData;

  const handleModelSelect = (model: AIModel) => {
    if (model.id === "") return;

    const success = handlePremiumModelSelect(model, (modelId) => {
      onValueChange(modelId);
      setOpen(false);
      setShowAllModels(false);
      setSearchQuery("");
      setExpandedPremium(false);
    });

    if (!success) {
      setOpen(false);
      setShowAllModels(false);
      setSearchQuery("");
      setExpandedPremium(false);
    }
  };

  const handleModelHover = (model: AIModel) => {
    setHoveredModel(model);
  };

  const handleViewAllModels = () => {
    setShowAllModels(true);
    // Scroll to top when showing all models
    setTimeout(() => {
      const scrollContainer = document.querySelector("[data-scroll-container]");
      if (scrollContainer) {
        scrollContainer.scrollTop = 0;
      }
    }, 50);
  };

  const handleBackToCategories = () => {
    setShowAllModels(false);
    setSearchQuery("");
    setExpandedPremium(false);
  };

  const handleExpandPremium = () => {
    setExpandedPremium(!expandedPremium);
  };

  React.useEffect(() => {
    if (!value && defaultModel) {
      onValueChange(defaultModel);
    }
  }, [value, defaultModel, onValueChange]);

  const isCompact = variant === "compact";
  const contentHeight = isCompact ? "h-[300px]" : "h-[400px]";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between text-left",
            isCompact ? "h-9 px-3 w-auto min-w-[140px]" : "w-full h-auto p-3"
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            {selectedModelData && getProviderIcon(selectedModelData.provider)}
            <div className="flex flex-col items-start">
              <span
                className={cn("font-medium", isCompact ? "text-xs" : "text-sm")}
              >
                {selectedModelData?.name || "Select model"}
              </span>
              {!isCompact && selectedModelData && (
                <span className="text-xs text-foreground-muted">
                  {selectedModelData.provider}
                </span>
              )}
            </div>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[600px] p-0" align="start">
        <div className={cn("grid grid-cols-2", contentHeight)}>
          <div className="border-r border-subtle overflow-hidden">
            <div
              data-scroll-container
              className="h-full overflow-y-auto overflow-x-hidden"
            >
              <AnimatePresence mode="wait">
                {!showAllModels ? (
                  <motion.div
                    key="categories"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="p-3 border-b border-subtle">
                      <h3 className="font-medium text-sm text-foreground-default">
                        Choose Model
                      </h3>
                    </div>

                    <div className="p-2">
                      <div className="flex items-center gap-2 px-2 py-1 mb-2">
                        <Gift className="w-4 h-4 text-success" />
                        <span className="text-xs font-medium text-foreground-subtle uppercase tracking-wide">
                          Free Models
                        </span>
                      </div>

                      {freeModels.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => handleModelSelect(model)}
                          onMouseEnter={() => handleModelHover(model)}
                          className={cn(
                            "w-full text-left p-2 rounded-md transition-colors hover:bg-surface-hover",
                            selectedModelData?.id === model.id &&
                              "bg-surface-secondary"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {getProviderIcon(model.provider)}
                            <span className="font-medium text-sm truncate">
                              {model.name}
                            </span>
                            {model.recommended && (
                              <Badge
                                variant="success"
                                className="text-xs shrink-0"
                              >
                                Recommended
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-foreground-muted line-clamp-2">
                            {model.description}
                          </p>
                        </button>
                      ))}
                    </div>

                    <Separator className="mx-2" />

                    <div className="p-2">
                      <div className="flex items-center justify-between px-2 py-1 mb-2">
                        <div className="flex items-center gap-2">
                          <Crown className="w-4 h-4 text-warning" />
                          <span className="text-xs font-medium text-foreground-subtle uppercase tracking-wide">
                            Premium Models
                          </span>
                          {isCheckingApiKey && (
                            <Loader2 className="w-3 h-3 animate-spin text-foreground-muted" />
                          )}
                        </div>
                        <button
                          onClick={handleExpandPremium}
                          className="text-xs text-foreground-subtle hover:text-foreground-default transition-colors"
                        >
                          {expandedPremium
                            ? "Show less"
                            : `Show all (${premiumModels.length})`}
                        </button>
                      </div>

                      <AnimatePresence>
                        {!hasOpenRouterKey && !isCheckingApiKey && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-2 p-2 bg-warning/10 border border-warning/20 rounded-md"
                          >
                            <div className="flex items-center gap-2 text-xs text-warning">
                              <AlertCircle className="w-3 h-3" />
                              <span>API key required for premium models</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="space-y-1">
                        {isCheckingApiKey
                          ? Array.from({ length: 3 }).map((_, i) => (
                              <ModelItemSkeleton key={i} />
                            ))
                          : (expandedPremium
                              ? premiumModels
                              : premiumModels.slice(0, 3)
                            ).map((model) => {
                              const status = getPremiumModelStatus(model);
                              return (
                                <button
                                  key={model.id}
                                  onClick={() => handleModelSelect(model)}
                                  onMouseEnter={() => handleModelHover(model)}
                                  className={cn(
                                    "w-full text-left p-2 rounded-md transition-colors hover:bg-surface-hover",
                                    status.needsApiKey && "opacity-60",
                                    selectedModelData?.id === model.id &&
                                      "bg-surface-secondary"
                                  )}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    {getProviderIcon(model.provider)}
                                    <span className="font-medium text-sm truncate">
                                      {model.name}
                                    </span>
                                    <Badge
                                      variant="warning"
                                      className="text-xs shrink-0"
                                    >
                                      Premium
                                    </Badge>
                                    {model.recommended && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs shrink-0"
                                      >
                                        Recommended
                                      </Badge>
                                    )}
                                    {status.needsApiKey && (
                                      <div className="w-2 h-2 rounded-full bg-warning animate-pulse ml-auto" />
                                    )}
                                  </div>
                                  <p className="text-xs text-foreground-muted line-clamp-2">
                                    {model.description}
                                  </p>
                                  {status.needsApiKey && (
                                    <p className="text-xs text-warning mt-1">
                                      Click to add API key
                                    </p>
                                  )}
                                </button>
                              );
                            })}
                      </div>
                    </div>

                    <Separator className="mx-2" />

                    <div className="p-2">
                      <button
                        onClick={handleViewAllModels}
                        className="w-full px-2 py-1.5 text-xs text-foreground-subtle hover:text-foreground-default hover:bg-surface-hover rounded-md transition-colors"
                      >
                        View all models ({AVAILABLE_MODELS.length})...
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="all-models"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="p-3 border-b border-subtle">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleBackToCategories}
                          className="p-1 hover:bg-surface-hover rounded-md transition-colors"
                        >
                          <ArrowLeft className="w-4 h-4 text-foreground-subtle" />
                        </button>
                        <h3 className="font-medium text-sm text-foreground-default">
                          All Models ({filteredModels.length})
                        </h3>
                        {isCheckingApiKey && (
                          <Loader2 className="w-3 h-3 animate-spin text-foreground-muted" />
                        )}
                      </div>
                    </div>

                    <div className="p-2">
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

                      <div className="space-y-1">
                        {isCheckingApiKey
                          ? Array.from({ length: 6 }).map((_, i) => (
                              <ModelItemSkeleton key={i} />
                            ))
                          : filteredModels.map((model) => {
                              const status = getPremiumModelStatus(model);
                              return (
                                <button
                                  key={model.id}
                                  onClick={() => handleModelSelect(model)}
                                  onMouseEnter={() => handleModelHover(model)}
                                  className={cn(
                                    "w-full text-left p-2 rounded-md transition-colors hover:bg-surface-hover",
                                    status.needsApiKey && "opacity-60",
                                    selectedModelData?.id === model.id &&
                                      "bg-surface-secondary"
                                  )}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    {getProviderIcon(model.provider)}
                                    <span className="font-medium text-sm truncate">
                                      {model.name}
                                    </span>
                                    <div className="flex items-center gap-1 ml-auto">
                                      {model.free && (
                                        <Badge
                                          variant="success"
                                          className="text-xs"
                                        >
                                          Free
                                        </Badge>
                                      )}
                                      {!model.free && (
                                        <Badge
                                          variant="warning"
                                          className="text-xs"
                                        >
                                          Premium
                                        </Badge>
                                      )}
                                      {model.recommended && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          Recommended
                                        </Badge>
                                      )}
                                      {status.needsApiKey && (
                                        <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-xs text-foreground-muted line-clamp-1">
                                    {model.description}
                                  </p>
                                  {status.needsApiKey && (
                                    <p className="text-xs text-warning mt-1">
                                      Click to add API key
                                    </p>
                                  )}
                                </button>
                              );
                            })}

                        {!isCheckingApiKey && filteredModels.length === 0 && (
                          <div className="text-center py-8 text-foreground-muted text-xs">
                            No models found matching "{searchQuery}"
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="p-4 overflow-y-auto">
            {displayModel ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {getProviderIcon(displayModel.provider)}
                    <h3 className="font-semibold text-lg">
                      {displayModel.name}
                    </h3>
                  </div>
                  <p className="text-sm text-foreground-muted mb-3">
                    {displayModel.description}
                  </p>

                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-xs">
                      {displayModel.provider}
                    </Badge>
                    {displayModel.free && (
                      <Badge variant="success" className="text-xs">
                        Free
                      </Badge>
                    )}
                    {!displayModel.free && (
                      <Badge variant="warning" className="text-xs">
                        Premium
                      </Badge>
                    )}
                    {displayModel.recommended && (
                      <Badge variant="outline" className="text-xs">
                        Recommended
                      </Badge>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium text-sm mb-2">Capabilities</h4>
                  <div className="flex flex-wrap gap-1">
                    {displayModel.capabilities.map((capability) => (
                      <div
                        key={capability}
                        className="flex items-center gap-1 px-2 py-1 bg-surface-secondary rounded-md"
                      >
                        {getCapabilityIcon(capability)}
                        <span className="text-xs">{capability}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground-muted">Max Tokens:</span>
                    <span className="font-medium">
                      {displayModel.maxTokens.toLocaleString()}
                    </span>
                  </div>

                  {!displayModel.free && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground-muted">
                          Input Cost:
                        </span>
                        <span className="font-medium">
                          ${displayModel.costPer1kTokens.input.toFixed(4)}/1K
                          tokens
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground-muted">
                          Output Cost:
                        </span>
                        <span className="font-medium">
                          ${displayModel.costPer1kTokens.output.toFixed(4)}/1K
                          tokens
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {displayModel.supportsImages && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-2 text-sm text-info">
                      <Eye className="w-4 h-4" />
                      <span>Supports image input</span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-foreground-muted">
                <p className="text-sm">Hover over a model to view details</p>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
