import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

export function AssistantMarkdown({ content, isStreaming = false }: { content: string; isStreaming?: boolean }) {
  const normalizedContent = normalizeMathMarkdown(content);

  return (
    <div className="assistant-prose prose prose-invert max-w-none text-[15px] leading-7 text-[#f5f5f5] sm:text-base sm:leading-8">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          a: ({ children, ...props }) => (
            <a {...props} className="text-[#f5f5f5] underline decoration-[#6b7280] underline-offset-4 hover:decoration-[#f5f5f5]">
              {children}
            </a>
          ),
          code: ({ children, className, ...props }) => {
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return (
                <code {...props} className={`${className ?? ""} block overflow-x-auto whitespace-pre rounded-md bg-[#0a0a0a] p-4 text-[13px] leading-6 text-[#e5e7eb]`}>
                  {children}
                </code>
              );
            }

            return (
              <code {...props} className="rounded bg-[#1a1a1a] px-1.5 py-0.5 text-[0.9em] text-[#f5f5f5]">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="my-5 overflow-x-auto rounded-md bg-[#0a0a0a] p-0">{children}</pre>,
          table: ({ children }) => (
            <div className="my-5 overflow-x-auto rounded-md border border-[#1f1f1f]">
              <table className="m-0 w-full min-w-[520px] border-collapse text-sm">{children}</table>
            </div>
          ),
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
      {isStreaming ? <span className="streaming-cursor" aria-hidden="true" /> : null}
    </div>
  );
}

function normalizeMathMarkdown(content: string) {
  return content
    .split(/(```[\s\S]*?```)/g)
    .map((segment) => {
      if (segment.startsWith("```")) return segment;
      return normalizeFractionsInMath(convertLatexDelimiters(segment));
    })
    .join("");
}

function convertLatexDelimiters(content: string) {
  return content
    .replace(/\\\[((?:.|\n)*?)\\\]/g, (_, equation: string) => `$$\n${equation.trim()}\n$$`)
    .replace(/\\\(((?:.|\n)*?)\\\)/g, (_, equation: string) => `$${equation.trim()}$`);
}

function normalizeFractionsInMath(content: string) {
  return content.replace(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g, (mathSegment) =>
    mathSegment.replace(
      /(?<!\\frac\{)(?<![\w}])([A-Za-z0-9]+)\s*\/\s*([A-Za-z0-9]+)(?![\w{])/g,
      "\\frac{$1}{$2}",
    ),
  );
}
