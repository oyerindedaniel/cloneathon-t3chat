import { Button } from "@/components/ui/button";
import { GridCross } from "@/components/ui/grid-cross";
import { MessageSquare, Plus, Sparkles, Zap, Clock } from "lucide-react";

export default function ConversationsPage() {
  return (
    <div className="p-6 h-full font-sans">
      <div className="max-w-4xl mx-auto h-full flex flex-col">
        <div className="text-center py-12 relative">
          <GridCross position="center" size="lg" opacity={0.05} />

          <div className="auth-surface p-8 max-w-md mx-auto auth-animate-in relative">
            <GridCross position="tl" size="sm" opacity={0.2} />
            <GridCross position="tr" size="sm" opacity={0.2} />

            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 relative">
              <MessageSquare className="w-8 h-8 text-primary" />
              <GridCross
                position="relative"
                size="sm"
                opacity={0.3}
                className="absolute -top-1 -right-1"
                style={{ transform: "scale(0.6)" }}
              />
            </div>

            <h1 className="text-2xl font-bold text-foreground-default mb-3 font-sans">
              Start a new conversation
            </h1>
            <p className="text-foreground-muted mb-6 font-sans">
              Choose how you'd like to begin your AI-powered conversation
            </p>

            <Button size="lg" className="w-full gap-2 font-sans">
              <Plus className="w-4 h-4" />
              New Chat
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="auth-surface p-6 hover:scale-105 transition-transform cursor-pointer relative group">
            <GridCross
              position="relative"
              size="sm"
              opacity={0.1}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            />

            <div className="w-10 h-10 bg-provider-openai/10 rounded-lg flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5 text-provider-openai" />
            </div>
            <h3 className="font-semibold text-foreground-default mb-2 font-sans">
              Creative Writing
            </h3>
            <p className="text-sm text-foreground-muted font-sans">
              Get help with creative content and storytelling
            </p>
          </div>

          <div className="auth-surface p-6 hover:scale-105 transition-transform cursor-pointer relative group">
            <GridCross
              position="relative"
              size="sm"
              opacity={0.1}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            />

            <div className="w-10 h-10 bg-provider-anthropic/10 rounded-lg flex items-center justify-center mb-3">
              <Zap className="w-5 h-5 text-provider-anthropic" />
            </div>
            <h3 className="font-semibold text-foreground-default mb-2 font-sans">
              Code Assistant
            </h3>
            <p className="text-sm text-foreground-muted font-mono">
              Debug, review, and improve your code
            </p>
          </div>

          <div className="auth-surface p-6 hover:scale-105 transition-transform cursor-pointer relative group">
            <GridCross
              position="relative"
              size="sm"
              opacity={0.1}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            />

            <div className="w-10 h-10 bg-provider-google/10 rounded-lg flex items-center justify-center mb-3">
              <MessageSquare className="w-5 h-5 text-provider-google" />
            </div>
            <h3 className="font-semibold text-foreground-default mb-2 font-sans">
              General Chat
            </h3>
            <p className="text-sm text-foreground-muted font-sans">
              Have a conversation about anything
            </p>
          </div>
        </div>

        <div className="auth-surface p-6 relative">
          <GridCross position="tl" size="sm" opacity={0.15} />
          <GridCross position="br" size="sm" opacity={0.15} />

          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground-default font-sans">
              Continue where you left off
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                title: "AI Assistant Help",
                time: "2 minutes ago",
                preview: "How can I improve the performance of...",
              },
              {
                title: "Code Review Discussion",
                time: "1 hour ago",
                preview: "Let's review this React component...",
              },
              {
                title: "Project Planning",
                time: "3 hours ago",
                preview: "We need to plan the next sprint...",
              },
            ].map((item, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-surface-primary hover:bg-surface-hover transition-colors cursor-pointer border border-default/30"
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-foreground-default text-sm font-sans">
                    {item.title}
                  </h4>
                  <span className="text-xs text-foreground-muted font-mono">
                    {item.time}
                  </span>
                </div>
                <p className="text-xs text-foreground-muted truncate font-sans">
                  {item.preview}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
