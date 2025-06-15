import { api } from "@/trpc/react";
import { Loader2, Key, DollarSign, Zap } from "lucide-react";
import type { APIKeyProvider } from "@/types/app";

interface ApiKeyStatsProps {
  provider: APIKeyProvider;
}

export function ApiKeyStats({ provider }: ApiKeyStatsProps) {
  const {
    data: keyInfo,
    isLoading,
    error,
  } = api.apiKeys.getApiKeyInfo.useQuery(
    { provider },
    {
      refetchInterval: 30000,
      staleTime: 15000,
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-foreground-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading API key info...
      </div>
    );
  }

  if (error || !keyInfo?.hasKey) {
    return null;
  }

  if (!keyInfo.info) {
    return (
      <div className="text-sm text-warning">
        Unable to fetch API key information
        {keyInfo.error && (
          <div className="text-xs opacity-75 mt-1">{keyInfo.error}</div>
        )}
      </div>
    );
  }

  const {
    label,
    usage,
    limit,
    limit_remaining,
    is_free_tier,
    is_provisioning_key,
  } = keyInfo.info;

  const usagePercentage = limit > 0 ? (usage / limit) * 100 : 0;

  return (
    <div className="space-y-3 p-4 bg-surface-secondary rounded-lg border border-subtle">
      <div className="flex items-center gap-2">
        <Key className="h-4 w-4 text-foreground-subtle" />
        <span className="font-medium text-sm">{label}</span>
        {is_free_tier && (
          <span className="px-2 py-0.5 text-xs bg-info/10 text-info rounded-full border border-info/20">
            Free Tier
          </span>
        )}
        {is_provisioning_key && (
          <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full border border-primary/20">
            Provisioning
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-success" />
          <div>
            <div className="font-medium">${usage.toFixed(2)}</div>
            <div className="text-xs text-foreground-muted">Used</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-info" />
          <div>
            <div className="font-medium">${limit_remaining.toFixed(2)}</div>
            <div className="text-xs text-foreground-muted">Remaining</div>
          </div>
        </div>
      </div>

      {limit > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-foreground-muted">
            <span>Usage</span>
            <span>{usagePercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-surface-tertiary rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                usagePercentage > 90
                  ? "bg-error"
                  : usagePercentage > 70
                  ? "bg-warning"
                  : "bg-success"
              }`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-foreground-muted">
            <span>${usage.toFixed(2)}</span>
            <span>${limit.toFixed(2)} limit</span>
          </div>
        </div>
      )}
    </div>
  );
}
