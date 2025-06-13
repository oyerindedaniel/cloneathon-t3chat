import { SidebarInput } from "../ui/sidebar";

export function ConversationSearch({
  searchQuery,
  setSearchQuery,
}: {
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (
    <SidebarInput
      placeholder="Search conversations..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="h-8 bg-surface-tertiary border-default/30 font-mono"
    />
  );
}
