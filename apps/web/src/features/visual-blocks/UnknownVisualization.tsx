import React from "react";
import { AlertTriangle } from "lucide-react";

export function UnknownVisualization({ type }: { type: string }) {
  return (
    <div className="mt-3 flex flex-col items-center justify-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
      <AlertTriangle size={28} className="text-amber-400" />
      <p className="text-sm text-amber-300 font-medium">
        Visualization type <code className="px-1.5 py-0.5 bg-black/30 rounded text-xs font-mono">{type}</code> is not supported yet.
      </p>
      <p className="text-xs text-slate-500">
        This concept will be visualizable in a future update.
      </p>
    </div>
  );
}
