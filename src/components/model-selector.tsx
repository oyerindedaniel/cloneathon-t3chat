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
import {
  AIModel,
  getModelById,
  getFreeModels,
  getPremiumModels,
} from "@/lib/ai/models";

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
    case "vision":
      return <Eye className="w-3 h-3" />;
    case "code":
      return <Code className="w-3 h-3" />;
    case "fast responses":
      return <Zap className="w-3 h-3" />;
    case "free":
      return <Gift className="w-3 h-3" />;
    case "long context":
      return <Globe className="w-3 h-3" />;
    default:
      return null;
  }
}

export function ModelSelector({
  value,
  onValueChange,
  disabled,
  variant = "full",
}: ModelSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [hoveredModel, setHoveredModel] = React.useState<AIModel | null>(null);

  const selectedModelData = getModelById(value);
  const freeModels = getFreeModels();
  const premiumModels = getPremiumModels();

  const displayModel = hoveredModel || selectedModelData;

  const handleModelSelect = (model: AIModel) => {
    if (model.disabled) return;
    onValueChange(model.id);
    setOpen(false);
  };

  const handleModelHover = (model: AIModel) => {
    setHoveredModel(model);
  };

  const handleModelLeave = () => {
    setHoveredModel(null);
  };

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
          <div className="border-r border-subtle overflow-y-auto overflow-x-hidden">
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
                  onMouseLeave={handleModelLeave}
                  className={cn(
                    "w-full text-left p-2 rounded-md transition-colors hover:bg-surface-hover",
                    selectedModelData?.id === model.id && "bg-surface-secondary"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {getProviderIcon(model.provider)}
                    <span className="font-medium text-sm truncate">
                      {model.name}
                    </span>
                    {model.recommended && (
                      <Badge variant="success" className="text-xs shrink-0">
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
              <div className="flex items-center gap-2 px-2 py-1 mb-2">
                <Crown className="w-4 h-4 text-warning" />
                <span className="text-xs font-medium text-foreground-subtle uppercase tracking-wide">
                  Premium Models
                </span>
              </div>

              {premiumModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleModelSelect(model)}
                  onMouseEnter={() => handleModelHover(model)}
                  onMouseLeave={handleModelLeave}
                  disabled={model.disabled}
                  className={cn(
                    "w-full text-left p-2 rounded-md transition-colors",
                    model.disabled
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-surface-hover",
                    selectedModelData?.id === model.id && "bg-surface-secondary"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {getProviderIcon(model.provider)}
                    <span className="font-medium text-sm truncate">
                      {model.name}
                    </span>
                    {model.recommended && (
                      <Badge variant="warning" className="text-xs shrink-0">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-foreground-muted line-clamp-2">
                    {model.description}
                  </p>
                  {model.disabled && (
                    <p className="text-xs text-error mt-1">
                      {model.disabledReason}
                    </p>
                  )}
                </button>
              ))}
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
                    {displayModel.recommended && (
                      <Badge variant="warning" className="text-xs">
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
