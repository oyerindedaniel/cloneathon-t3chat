import dynamic from "next/dynamic";
import { Suspense } from "react";

const ChatApp = dynamic(() => import("@/components/chat-app"), {
  ssr: false,
  loading: () => <AppShellLoading />,
});

function AppShellLoading() {
  return (
    <div className="flex h-screen bg-surface-primary">
      <div className="w-64 bg-surface-secondary border-r border-default">
        <div className="p-4 space-y-4">
          <div className="h-8 bg-surface-tertiary rounded animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-6 bg-surface-tertiary rounded animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="h-16 bg-surface-secondary border-b border-default p-4">
          <div className="h-8 bg-surface-tertiary rounded animate-pulse" />
        </div>

        <div className="flex-1 p-4 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-surface-tertiary rounded animate-pulse w-1/4" />
              <div className="h-16 bg-surface-tertiary rounded animate-pulse" />
            </div>
          ))}
        </div>

        <div className="h-20 bg-surface-secondary border-t border-default p-4">
          <div className="h-12 bg-surface-tertiary rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<AppShellLoading />}>
      <ChatApp />
    </Suspense>
  );
}
