import React from "react";
import type { PhysicsLabParams } from "../../sscPhysicsEngine";

export function WaveGraphs({
  params,
  formulaId,
  time,
}: {
  params: PhysicsLabParams;
  formulaId: string;
  time: number;
}) {
  const period = 1 / params.frequency;
  
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-[#222] bg-[#111] p-4">
        <h3 className="mb-4 text-xs font-medium text-gray-400">Displacement vs Time (Source)</h3>
        <div className="relative h-32">
          {/* Simple purely CSS/SVG based graph */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
            {/* Grid */}
            <line x1="0" y1="50" x2="100" y2="50" stroke="#333" strokeWidth="1" />
            <line x1="0" y1="0" x2="0" y2="100" stroke="#333" strokeWidth="1" />
            
            {/* Render a static sine wave, with a dot moving along it */}
            <path
              d={`M0 50 ${Array.from({ length: 50 }).map((_, i) => {
                const x = (i / 49) * 100;
                // show 2 periods
                const y = 50 + Math.sin((x / 100) * Math.PI * 4) * 40;
                return `L${x} ${y}`;
              }).join(' ')}`}
              fill="none"
              stroke="#60a5fa"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            
            {/* The moving dot representing the source particle */}
            {/* We map `time` (progress 0->1) to move across the 2 periods */}
            <circle
              cx={(time * 100) % 100}
              cy={50 + Math.sin(((time * 100) % 100) / 100 * Math.PI * 4) * 40}
              r="4"
              fill="#ff3b30"
              vectorEffect="non-scaling-stroke"
            />
            
            <text x="5" y="10" className="fill-gray-500 text-[10px]">y (m)</text>
            <text x="90" y="45" className="fill-gray-500 text-[10px]">t (s)</text>
          </svg>
        </div>
      </div>
      
      <div className="rounded-lg border border-[#222] bg-[#111] p-4">
        <h3 className="mb-4 text-xs font-medium text-gray-400">Frequency vs Period Relationship</h3>
        <div className="relative h-32 flex flex-col justify-center items-center gap-2">
          <div className="flex w-full items-center justify-between text-sm">
            <span className="text-gray-400">Frequency (f)</span>
            <span className="font-mono text-emerald-400">{params.frequency.toFixed(2)} Hz</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
            <div 
              className="h-full bg-emerald-500 transition-all" 
              style={{ width: `${Math.min(100, (params.frequency / 12) * 100)}%` }}
            />
          </div>
          
          <div className="mt-2 flex w-full items-center justify-between text-sm">
            <span className="text-gray-400">Period (T = 1/f)</span>
            <span className="font-mono text-blue-400">{period.toFixed(3)} s</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
            <div 
              className="h-full bg-blue-500 transition-all" 
              style={{ width: `${Math.min(100, (period / 2) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
