export function MessageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex w-full justify-end">
        <div className="bg-primary/5 rounded-lg p-4 ml-auto">
          <div className="h-4 bg-foreground-muted/20 rounded animate-pulse w-48" />
        </div>
      </div>

      <div className="flex w-full">
        <div className="bg-primary/5 rounded-lg p-4 space-y-2 max-w-[80%] w-full">
          <div className="h-4 bg-foreground-muted/20 rounded animate-pulse w-full" />
          <div className="h-4 bg-foreground-muted/20 rounded animate-pulse w-5/6" />
          <div className="h-4 bg-foreground-muted/20 rounded animate-pulse w-4/5" />
        </div>
      </div>
    </div>
  );
}
