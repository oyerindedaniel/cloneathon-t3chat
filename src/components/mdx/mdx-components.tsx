import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Copy, Check, Hash } from "lucide-react";
import { useClipboard } from "@/hooks/use-clipboard";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
  vscDarkPlus,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "next-themes";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Typography components
const H1 = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h1
    className={cn(
      "text-2xl font-bold tracking-tight text-foreground-default mb-4 mt-6 first:mt-0",
      className
    )}
    {...props}
  />
);

const H2 = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2
    className={cn(
      "text-xl font-semibold tracking-tight text-foreground-default mb-3 mt-5 first:mt-0",
      className
    )}
    {...props}
  />
);

const H3 = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    className={cn(
      "text-lg font-semibold tracking-tight text-foreground-default mb-3 mt-4 first:mt-0",
      className
    )}
    {...props}
  />
);

const H4 = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h4
    className={cn(
      "text-base font-semibold tracking-tight text-foreground-default mb-2 mt-4 first:mt-0",
      className
    )}
    {...props}
  />
);

const H5 = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h5
    className={cn(
      "text-sm font-semibold tracking-tight text-foreground-default mb-2 mt-3 first:mt-0",
      className
    )}
    {...props}
  />
);

const H6 = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h6
    className={cn(
      "text-xs font-semibold tracking-tight text-foreground-default mb-2 mt-3 first:mt-0",
      className
    )}
    {...props}
  />
);

// Text components
const P = ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <p
    className={cn(
      "text-foreground-default leading-relaxed mb-3 group-[.reasoning]:font-mono group-[.reasoning]:whitespace-pre-wrap group-[.reasoning]:text-xs group-[.reasoning]:text-foreground-subtle",
      className
    )}
    {...props}
  />
);

const Strong = ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <strong
    className={cn("font-semibold text-foreground-default", className)}
    {...props}
  />
);

const Em = ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <em className={cn("italic text-foreground-default", className)} {...props} />
);

// List components
const Ul = ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <ul
    className={cn(
      "list-disc list-inside space-y-1 mb-3 text-foreground-default",
      className
    )}
    {...props}
  />
);

const Ol = ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <ol
    className={cn(
      "list-decimal list-inside space-y-1 mb-3 text-foreground-default",
      className
    )}
    {...props}
  />
);

const Li = ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <li className={cn("text-foreground-default", className)} {...props} />
);

// Link component
const A = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLAnchorElement>) => (
  <a
    className={cn(
      "text-primary hover:text-primary/80 underline underline-offset-2 transition-colors",
      className
    )}
    {...props}
  />
);

// Blockquote component
const Blockquote = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLQuoteElement>) => (
  <blockquote
    className={cn(
      "border-l-4 border-subtle pl-4 py-2 mb-3 text-foreground-subtle italic bg-surface-secondary/50 rounded-r-md",
      className
    )}
    {...props}
  />
);

// Table components
const Table = ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <div className="overflow-x-auto mb-3">
    <table
      className={cn(
        "w-full border-collapse border border-subtle rounded-md",
        className
      )}
      {...props}
    />
  </div>
);

const Thead = ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <thead
    className={cn("bg-surface-secondary text-foreground-default", className)}
    {...props}
  />
);

const Tbody = ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <tbody className={cn("text-foreground-default", className)} {...props} />
);

const Tr = ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <tr
    className={cn("border-b border-subtle hover:bg-surface-hover", className)}
    {...props}
  />
);

const Th = ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <th
    className={cn(
      "text-left p-3 font-semibold border-r border-subtle last:border-r-0",
      className
    )}
    {...props}
  />
);

const Td = ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <td
    className={cn("p-3 border-r border-subtle last:border-r-0", className)}
    {...props}
  />
);

// Horizontal rule
const Hr = ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <hr
    className={cn("border-0 border-t border-subtle my-6", className)}
    {...props}
  />
);

// Inline code component
const InlineCode = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) => (
  <code
    className={cn(
      "px-1.5 py-0.5 rounded text-xs font-mono bg-surface-secondary text-foreground-default border border-subtle",
      className
    )}
    {...props}
  />
);

const Pre = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLPreElement>) => {
  const { copied, copy } = useClipboard();
  const { theme } = useTheme();
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  let language = "text";
  let code = "";

  if (React.isValidElement(children)) {
    const codeElement = children as React.ReactElement<{
      className?: React.HTMLAttributes<HTMLDivElement>["className"];
      children?: string;
    }>;

    // Get language from className
    const className = codeElement.props.className || "";
    const match = className.match(/language-(\w+)/);
    language = match ? match[1] : "text";

    // Get code content directly from children
    code = codeElement.props.children || "";
  } else if (typeof children === "string") {
    code = children;
  } else {
    code = String(children || "");
  }

  const handleCopy = () => {
    copy(code);
  };

  const toggleLineNumbers = () => {
    setShowLineNumbers(!showLineNumbers);
  };

  return (
    <div className="group mb-3 w-full h-full">
      <div className="flex items-center justify-between px-4 py-2 bg-surface-tertiary/50 border border-border-subtle border-b-0 rounded-t-md backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-foreground-muted uppercase tracking-wide">
            {language}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleLineNumbers}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 text-xs transition-colors rounded",
                  "hover:bg-surface-secondary/80",
                  showLineNumbers
                    ? "text-foreground-default bg-surface-secondary/60"
                    : "text-foreground-muted"
                )}
                title="Toggle line numbers"
              >
                <Hash className="w-3 h-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{showLineNumbers ? "Hide" : "Show"} line numbers</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 text-xs text-foreground-muted hover:text-foreground-default transition-colors rounded hover:bg-surface-secondary/80"
                title="Copy code"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span className="hidden sm:inline">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span className="hidden sm:inline">Copy</span>
                  </>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{copied ? "Copied!" : "Copy code"}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <SyntaxHighlighter
        language={language}
        style={theme === "dark" ? vscDarkPlus : oneLight}
        showLineNumbers={showLineNumbers}
        customStyle={{
          margin: 0,
          borderRadius: "0 0 0.375rem 0.375rem",
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          border: "1px solid var(--border-subtle)",
          borderTop: "none",
          color: "var(--foreground-default)",
          background: "var(--chat-code-bg)",
        }}
        codeTagProps={{
          style: {
            fontFamily: "var(--font-geist-mono)",
            fontSize: "0.75rem",
            lineHeight: "1.5",
          },
        }}
      >
        {String(code).replace(/\n$/, "")}
      </SyntaxHighlighter>
    </div>
  );
};

export const mdxComponents = {
  h1: H1,
  h2: H2,
  h3: H3,
  h4: H4,
  h5: H5,
  h6: H6,
  p: P,
  strong: Strong,
  em: Em,
  ul: Ul,
  ol: Ol,
  li: Li,
  a: A,
  blockquote: Blockquote,
  table: Table,
  thead: Thead,
  tbody: Tbody,
  tr: Tr,
  th: Th,
  td: Td,
  hr: Hr,
  code: InlineCode,
  pre: Pre,
};

export type MDXComponents = typeof mdxComponents;
