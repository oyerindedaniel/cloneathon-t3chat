import React, { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { mdxComponents } from "./mdx-components";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: React.HTMLAttributes<HTMLDivElement>["className"];
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  return (
    <div className={cn("max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={mdxComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
},
areEqual);

function areEqual(
  prevProps: MarkdownRendererProps,
  nextProps: MarkdownRendererProps
): boolean {
  return (
    prevProps.content === nextProps.content &&
    prevProps.className === nextProps.className
  );
}
