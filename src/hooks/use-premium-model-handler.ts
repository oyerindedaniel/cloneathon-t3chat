import { useCallback } from "react";
import { api } from "@/trpc/react";
import { useSettings } from "@/contexts/settings-context";
import type { AIModel } from "@/lib/ai/models";

export function usePremiumModelHandler() {
  const { openSettings } = useSettings();
  const {
    data: apiKeyData,
    isLoading: isCheckingApiKey,
    refetch: refetchApiKey,
  } = api.apiKeys.getApiKey.useQuery(
    { provider: "openrouter" },
    {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    }
  );

  const hasOpenRouterKey = !!apiKeyData?.key;

  const handlePremiumModelSelect = useCallback(
    (model: AIModel, onSuccess?: (modelId: string) => void) => {
      if (model.free) {
        onSuccess?.(model.id);
        return true;
      }

      if (!hasOpenRouterKey) {
        openSettings("api-keys");
        return false;
      }

      onSuccess?.(model.id);
      return true;
    },
    [hasOpenRouterKey, openSettings]
  );

  const isPremiumModelDisabled = useCallback(
    (model: AIModel) => {
      return !model.free && !hasOpenRouterKey;
    },
    [hasOpenRouterKey]
  );

  const getPremiumModelStatus = useCallback(
    (model: AIModel) => {
      if (model.free) {
        return { disabled: false, needsApiKey: false };
      }

      const needsApiKey = !hasOpenRouterKey;
      return {
        disabled: needsApiKey,
        needsApiKey,
        isLoading: isCheckingApiKey,
      };
    },
    [hasOpenRouterKey, isCheckingApiKey]
  );

  return {
    hasOpenRouterKey,
    isCheckingApiKey,
    handlePremiumModelSelect,
    isPremiumModelDisabled,
    getPremiumModelStatus,
    refetchApiKey,
  };
}
