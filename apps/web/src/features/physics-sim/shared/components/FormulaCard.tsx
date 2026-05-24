import React from "react";
import katex from "katex";
import type { FormulaDefinition } from "../../sscPhysicsEngine";

export function FormulaCard({ formula }: { formula: FormulaDefinition }) {
  const rendered = katex.renderToString(formula.latex, {
    displayMode: true,
    throwOnError: false,
  });

  return (
    <div className="rounded-md bg-[#151515] p-3">
      <p className="text-[11px] text-[#9ca3af]">{formula.title}</p>
      <div
        className="physics-formula mt-1 overflow-x-auto text-[#f5f5f5]"
        dangerouslySetInnerHTML={{ __html: rendered }}
      />
      <p className="mt-2 text-[11px] leading-4 text-[#8b949e]">{formula.variables}</p>
    </div>
  );
}
