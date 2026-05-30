import { useEffect, useRef, useState, useId } from "react";
import mermaid from "mermaid";

// Initialise once — "base" theme gives us full control over every colour variable
mermaid.initialize({
  startOnLoad: false,
  theme: "base",
  themeVariables: {
    // ── Node backgrounds ─────────────────────────────────────────
    primaryColor: "#1e293b",
    primaryBorderColor: "#475569",
    primaryTextColor: "#f1f5f9",
    secondaryColor: "#0f172a",
    secondaryBorderColor: "#334155",
    secondaryTextColor: "#cbd5e1",
    tertiaryColor: "#1e293b",
    tertiaryBorderColor: "#475569",
    tertiaryTextColor: "#f1f5f9",

    // ── Edges & lines ────────────────────────────────────────────
    lineColor: "#64748b",
    edgeLabelBackground: "#0f172a",

    // ── Canvas ───────────────────────────────────────────────────
    background: "#0d1117",
    mainBkg: "#1e293b",
    nodeBorder: "#475569",
    clusterBkg: "#111827",
    clusterBorder: "#334155",

    // ── Text ─────────────────────────────────────────────────────
    titleColor: "#f1f5f9",
    nodeTextColor: "#f1f5f9",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    fontSize: "14px",

    // ── Special node types ───────────────────────────────────────
    fillType0: "#1e3a5f",
    fillType1: "#1a3a1a",
    fillType2: "#3a1a1a",
    fillType3: "#2a1a3a",

    // ── Sequence diagram ─────────────────────────────────────────
    actorBkg: "#1e293b",
    actorBorder: "#475569",
    actorTextColor: "#f1f5f9",
    actorLineColor: "#64748b",
    signalColor: "#94a3b8",
    signalTextColor: "#f1f5f9",
    labelBoxBkgColor: "#1e293b",
    labelBoxBorderColor: "#475569",
    labelTextColor: "#f1f5f9",
    loopTextColor: "#f1f5f9",
    noteBorderColor: "#475569",
    noteBkgColor: "#0f172a",
    noteTextColor: "#cbd5e1",
    activationBorderColor: "#60a5fa",
    activationBkgColor: "#1e3a5f",

    // ── Pie chart ────────────────────────────────────────────────
    pie1: "#3b82f6",
    pie2: "#10b981",
    pie3: "#f59e0b",
    pie4: "#8b5cf6",
    pie5: "#ef4444",
    pie6: "#06b6d4",
    pieTitleTextColor: "#f1f5f9",
    pieSectionTextColor: "#f1f5f9",
    pieStrokeColor: "#0d1117",
    pieOpacity: "0.9",

    // ── Class diagram ────────────────────────────────────────────
    classText: "#f1f5f9",
  },
  flowchart: { curve: "basis", padding: 20, htmlLabels: true },
  sequence: { useMaxWidth: true, mirrorActors: false },
  er: { useMaxWidth: true },
});

export function MermaidDiagram({ code }: { code: string }) {
  const uid = useId().replace(/:/g, "");
  const diagramId = `mermaid-${uid}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"rendering" | "ok" | "error">("rendering");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const { svg } = await mermaid.render(diagramId, code.trim());
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;

          const svgEl = containerRef.current.querySelector("svg");
          if (svgEl) {
            svgEl.style.maxWidth = "100%";
            svgEl.style.height = "auto";
            svgEl.style.display = "block";
            svgEl.style.margin = "0 auto";
            svgEl.removeAttribute("width");
            svgEl.removeAttribute("height");

            // Force all text nodes inside SVG to be light — prevents prose-invert bleed
            svgEl.querySelectorAll("text, tspan").forEach((el) => {
              (el as SVGElement).style.fill = "#f1f5f9";
            });
          }

          setState("ok");
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setErrorMsg(e instanceof Error ? e.message : String(e));
          setState("error");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [code, diagramId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    // not-prose: opt this entire block out of Tailwind Typography so prose-invert
    // doesn't override the mermaid SVG colours.
    <div className="not-prose my-5 overflow-hidden rounded-xl border border-white/10 bg-[#0d1117]">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <path d="M17.5 17.5L21 21M14 17.5h3.5v-3.5"/>
          </svg>
          Diagram
        </span>
        <button
          onClick={handleCopy}
          className="rounded px-2 py-0.5 text-[11px] text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
        >
          {copied ? "✓ Copied" : "Copy source"}
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        {state === "rendering" && (
          <div className="flex h-28 items-center justify-center gap-3 text-sm text-slate-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-slate-400" />
            Rendering diagram…
          </div>
        )}

        {state === "error" && (
          <details className="rounded-lg border border-red-900/40 bg-red-950/20 p-4">
            <summary className="cursor-pointer select-none text-sm font-medium text-red-400">
              Diagram could not render — click to see source
            </summary>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-[12px] leading-5 text-red-300/60">
              {code}
            </pre>
            {errorMsg && (
              <p className="mt-2 text-[11px] text-red-500/50">{errorMsg}</p>
            )}
          </details>
        )}

        {/* The mermaid SVG is injected here */}
        <div
          ref={containerRef}
          className={state !== "ok" ? "hidden" : "flex justify-center overflow-x-auto"}
        />
      </div>
    </div>
  );
}
