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
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }], rehypeHighlight]}
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

// ─── MASTER PIPELINE ──────────────────────────────────────────────

function normalizeMathMarkdown(content: string): string {
  // Step 1: Extract and protect code blocks from ALL processing
  const codeBlocks: string[] = [];
  let text = content.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `\n\n__CB${codeBlocks.length - 1}__\n\n`;
  });

  // Step 2: Convert \[...\] and \(...\) to $$ and $ (with blank lines around display math)
  text = convertLatexDelimiters(text);

  // Step 3: Isolate every $$ delimiter onto its own line with blank lines around
  //         the ENTIRE math block — this is the CORE fix.
  text = isolateDisplayMath(text);

  // Step 4: Force blank lines before headings, numbered items, bullet items
  text = forceStructuralSpacing(text);

  // Step 5: Balance orphan $ signs (odd count in a paragraph → escape them)
  text = balanceInlineMath(text);

  // Step 6: Convert bare fractions inside math to \frac{}{}
  text = normalizeFractionsInMath(text);

  // Step 7: Restore code blocks
  codeBlocks.forEach((block, i) => {
    text = text.replace(`__CB${i}__`, block);
  });

  // Step 8: Collapse 3+ consecutive blank lines into 2
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return text;
}

// ─── STEP 2: CONVERT LATEX DELIMITERS ────────────────────────────

function convertLatexDelimiters(content: string): string {
  return content
    // \[...\]  → display math with guaranteed blank-line padding
    .replace(/\\\[((?:.|\n)*?)\\\]/g, (_, eq: string) => `\n\n$$\n${eq.trim()}\n$$\n\n`)
    // \(...\)  → inline math
    .replace(/\\\(((?:.|\n)*?)\\\)/g, (_, eq: string) => `$${eq.trim()}$`);
}

// ─── STEP 3: ISOLATE DISPLAY MATH ────────────────────────────────
// Guarantees every $$ lives on its own line and the math block has
// blank lines BEFORE the opening $$ and AFTER the closing $$.
// Text will NEVER be sandwiched between two $$ and mis-parsed.

function isolateDisplayMath(content: string): string {
  // First: break apart single-line display math  $$..content..$$ → three lines
  let text = content.replace(/\$\$([^\n]+?)\$\$/g, "\n\n$$\n$1\n$$\n\n");

  // Second: if $$ appears with text on the SAME line, split them apart.
  //   "text$$"  →  "text\n\n$$"
  //   "$$text"  →  "$$\ntext"
  text = text.replace(/([^\n$])\$\$/g, "$1\n\n$$");
  text = text.replace(/\$\$([^\n$])/g, "$$\n$1");

  // Third: state-machine pass — track inside/outside math and enforce
  //        blank lines only OUTSIDE the math block.
  const lines = text.split("\n");
  const out: string[] = [];
  let inMath = false;

  for (const raw of lines) {
    const trimmed = raw.trim();

    if (trimmed === "$$") {
      if (!inMath) {
        // Opening $$: blank line before if previous line is non-blank
        if (out.length > 0 && out[out.length - 1] !== "") {
          out.push("");
        }
        out.push("$$");
        inMath = true;
      } else {
        // Closing $$: push it, then blank line after
        out.push("$$");
        out.push("");
        inMath = false;
      }
    } else {
      out.push(raw);
    }
  }

  return out.join("\n");
}

// ─── STEP 4: FORCE STRUCTURAL SPACING ───────────────────────────
// Small models (qwen2.5:3b) often omit the blank line Markdown
// needs before headings, list items and bold numbered items.

function forceStructuralSpacing(content: string): string {
  return content
    // Blank line before any heading (#, ##, ### …)
    .replace(/([^\n])\n(#{1,6} )/g, "$1\n\n$2")
    // Blank line before numbered list item  "1. " "2. "
    .replace(/([^\n\d])\n(\d+\.\s)/g, "$1\n\n$2")
    // Blank line before bullet list item  "- "
    .replace(/([^\n\-\s])\n(- )/g, "$1\n\n$2");
}

// ─── STEP 5: BALANCE INLINE MATH ────────────────────────────────
// If a paragraph has an ODD number of un-escaped $ signs, the
// remainder of the text gets swallowed as math.  Escape them all
// in that paragraph so they render as literal $ characters.

function balanceInlineMath(content: string): string {
  return content
    .split("\n\n")
    .map((paragraph) => {
      // Skip paragraphs that are display math blocks
      if (paragraph.trim().startsWith("$$")) return paragraph;

      const dollarCount = (paragraph.match(/(?<!\\)\$/g) || []).length;
      if (dollarCount % 2 !== 0) {
        return paragraph.replace(/(?<!\\)\$/g, "\\$");
      }
      return paragraph;
    })
    .join("\n\n");
}

// ─── STEP 6: NORMALISE FRACTIONS IN MATH ────────────────────────

function normalizeFractionsInMath(content: string): string {
  return content.replace(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g, (mathSegment) =>
    mathSegment.replace(
      /\\text\{(?:[^{}]|\{[^{}]*\})*\}|(?<!\\frac\{)(?<![\w}])([A-Za-z0-9]+)\s*\/\s*([A-Za-z0-9]+)(?![\w{])/g,
      (match, p1, p2) => {
        if (match.startsWith("\\text")) return match;
        return `\\frac{${p1}}{${p2}}`;
      },
    ),
  );
}
