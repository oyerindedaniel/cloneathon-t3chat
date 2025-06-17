import React from "react";

function SidebarMenuButtonSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="h-8 bg-surface-secondary rounded-lg animate-pulse"
        />
      ))}
    </div>
  );
}

export default SidebarMenuButtonSkeleton;
