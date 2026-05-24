import React from "react";
import type { PhysicsLabParams } from "../../sscPhysicsEngine";

export function ElectricityGraphs({
  params,
  formulaId,
  current,
  resistance,
  power,
  time,
}: {
  params: PhysicsLabParams;
  formulaId: string;
  current: number;
  resistance: number;
  power: number;
  time: number;
}) {
  const isCircuit = ["ohms-law", "wire-resistance", "series-resistance", "parallel-resistance", "electric-power"].includes(formulaId);
  const isField = ["coulombs-law", "electric-field"].includes(formulaId);
  const isCurrent = formulaId === "electric-current";

  if (isField) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-[#222] bg-[#111] p-4">
          <h3 className="mb-4 text-xs font-medium text-gray-400">Inverse Square Law (F ∝ 1/r²)</h3>
          <div className="relative h-32">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
              <line x1="0" y1="90" x2="100" y2="90" stroke="#333" strokeWidth="1" /> {/* x axis (r) */}
              <line x1="10" y1="0" x2="10" y2="100" stroke="#333" strokeWidth="1" /> {/* y axis (F) */}
              <path
                d={`M10 0 ${Array.from({ length: 90 }).map((_, i) => {
                  const x = 10 + i;
                  const r = Math.max(0.1, i / 10);
                  const y = Math.min(90, 90 - (10 / (r * r)));
                  return `L${x} ${Math.max(0, y)}`;
                }).join(' ')}`}
                fill="none"
                stroke="#a78bfa"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
              <text x="90" y="98" className="fill-gray-500 text-[8px]">r (m)</text>
              <text x="0" y="10" className="fill-gray-500 text-[8px]">F (N)</text>
            </svg>
          </div>
        </div>
      </div>
    );
  }

  if (isCurrent) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-[#222] bg-[#111] p-4">
          <h3 className="mb-4 text-xs font-medium text-gray-400">Charge over Time (Q = It)</h3>
          <div className="relative h-32 flex flex-col justify-center items-center">
             <div className="w-full flex justify-between text-sm text-gray-400 mb-2">
               <span>Time (t)</span>
               <span className="text-white">{params.t.toFixed(1)} s</span>
             </div>
             <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden mb-4">
                <div className="bg-blue-500 h-full transition-all" style={{ width: `${Math.min(100, (params.t / 20) * 100)}%` }} />
             </div>
             <div className="w-full flex justify-between text-sm text-gray-400 mb-2">
               <span>Total Charge (Q)</span>
               <span className="text-emerald-400 font-mono">{(current * params.t).toFixed(2)} C</span>
             </div>
             <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all" style={{ width: `${Math.min(100, ((current * params.t) / 100) * 100)}%` }} />
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (isCircuit) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-[#222] bg-[#111] p-4">
          <h3 className="mb-4 text-xs font-medium text-gray-400">Ohm's Law (V = IR)</h3>
          <div className="flex h-32 flex-col justify-center gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Voltage (V)</span>
              <span className="text-sm font-mono text-yellow-400">{params.voltage.toFixed(1)} V</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
              <div className="h-full bg-yellow-500" style={{ width: `${Math.min(100, (params.voltage / 24) * 100)}%` }} />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Resistance (R)</span>
              <span className="text-sm font-mono text-red-400">{resistance.toFixed(1)} Ω</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
              <div className="h-full bg-red-500" style={{ width: `${Math.min(100, (resistance / 24) * 100)}%` }} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Current (I)</span>
              <span className="text-sm font-mono text-blue-400">{current.toFixed(2)} A</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (current / 10) * 100)}%` }} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[#222] bg-[#111] p-4">
          <h3 className="mb-4 text-xs font-medium text-gray-400">Power Output (P = VI)</h3>
          <div className="flex h-32 items-center justify-center">
            <div className="text-center">
              <div className="text-4xl font-mono text-emerald-400">{power.toFixed(1)} W</div>
              <div className="mt-2 text-xs text-gray-500">Heat/Work generated per second</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
