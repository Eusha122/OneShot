import React from "react";
import { MotionState } from "../engine/MotionState";

interface GraphProps {
  state: MotionState;
  time: number; // 0 to 1
  formulaId: string;
}

export function KinematicsGraphs({ state, time, formulaId }: GraphProps) {
  const width = 640;
  const height = 280;
  const padding = 50;

  // Graph Area
  const gWidth = width - padding * 2;
  const gHeight = height - padding * 2;

  // Max values for scaling
  const maxT = Math.max(1, state.t);
  
  const currentVFinal = formulaId === "velocity" ? state.v : state.u + state.a * state.t;
  const actualMaxV = Math.max(0, state.u, currentVFinal);
  const actualMinV = Math.min(0, state.u, currentVFinal);

  const rangeV = Math.max(1, actualMaxV - actualMinV);
  const plotMaxV = actualMaxV + rangeV * 0.15;
  const plotMinV = actualMinV - rangeV * 0.15;
  const plotRangeV = plotMaxV - plotMinV;

  const getY = (v: number) => padding + gHeight - ((v - plotMinV) / plotRangeV) * gHeight;
  const getX = (t: number) => padding + (t / maxT) * gWidth;

  const zeroY = getY(0);

  // Generate path
  const steps = 40;
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * maxT;
    const currentV = formulaId === "velocity" ? state.v : state.u + state.a * t;
    points.push(`${getX(t)},${getY(currentV)}`);
  }

  // Current Playhead
  const currentT = time * state.t;
  const currentV = formulaId === "velocity" ? state.v : state.u + state.a * currentT;
  const cx = getX(currentT);
  const cy = getY(currentV);

  // y-axis positions for u and v
  const uY = getY(state.u);
  const vY = getY(currentVFinal);

  return (
    <div className="mt-4 rounded-md border border-[#2a2a2a] bg-[#111111] overflow-hidden drop-shadow-md">
      <div className="bg-[#1f1f1f] px-3 py-2 border-b border-[#2a2a2a] flex justify-between items-center">
        <span className="text-xs font-semibold text-gray-300">Velocity-Time Graph</span>
        <span className="text-[10px] font-mono text-emerald-400 bg-black/40 px-2 py-0.5 rounded">v = f(t)</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto block bg-[#0a0a0a]">
        {/* Grid */}
        <g stroke="rgba(255,255,255,0.05)" strokeWidth="1">
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={`h-${i}`} x1={padding} y1={padding + (i * gHeight) / 5} x2={width - padding} y2={padding + (i * gHeight) / 5} />
          ))}
          {Array.from({ length: 11 }).map((_, i) => (
            <line key={`v-${i}`} x1={padding + (i * gWidth) / 10} y1={padding} x2={padding + (i * gWidth) / 10} y2={height - padding} />
          ))}
        </g>

        {/* Axes */}
        {/* Y Axis points UP */}
        <line x1={padding} y1={height - padding + 10} x2={padding} y2={padding - 15} stroke="#6b7280" strokeWidth="2" markerEnd="url(#arrow)" />
        {/* X Axis points RIGHT at y=0 */}
        <line x1={padding - 10} y1={zeroY} x2={width - padding + 15} y2={zeroY} stroke="#6b7280" strokeWidth="2" markerEnd="url(#arrow)" />

        {/* Labels */}
        <text x={padding - 30} y={height / 2} fill="#9ca3af" fontSize="12" textAnchor="middle" transform={`rotate(-90, ${padding - 30}, ${height / 2})`}>
          Velocity (m/s)
        </text>
        <text x={width / 2} y={zeroY + 20} fill="#9ca3af" fontSize="12" textAnchor="middle">
          Time (s)
        </text>

        {/* Origin */}
        <text x={padding - 12} y={zeroY + 15} fill="#6b7280" fontSize="12" textAnchor="middle">O</text>

        {/* Plot Line */}
        <polyline points={points.join(" ")} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {/* Projections for u and v (dashed lines) */}
        {formulaId !== "velocity" && (
          <g strokeDasharray="4,4" strokeWidth="1.5">
            {/* u line */}
            <line x1={padding} y1={uY} x2={padding + gWidth} y2={uY} stroke="#ec4899" opacity="0.6" />
            <text x={padding - 15} y={uY + 4} fill="#ec4899" fontSize="12" textAnchor="end">u</text>
            
            {/* v line */}
            <line x1={padding} y1={vY} x2={padding + gWidth} y2={vY} stroke="#06b6d4" opacity="0.6" />
            <text x={padding - 15} y={vY + 4} fill="#06b6d4" fontSize="12" textAnchor="end">v</text>

            {/* Time markers */}
            <line x1={padding + gWidth} y1={zeroY} x2={padding + gWidth} y2={vY} stroke="#f59e0b" opacity="0.4" />
            <text x={padding + gWidth} y={zeroY + 20} fill="#f59e0b" fontSize="12" textAnchor="middle">t</text>
          </g>
        )}

        {/* Playhead Marker */}
        <g transform={`translate(${cx}, ${cy})`}>
          <line x1="0" y1="0" x2="0" y2={zeroY - cy} stroke="#10b981" strokeWidth="1.5" strokeDasharray="3,3" />
          <circle cx="0" cy="0" r="5" fill="#f8fafc" stroke="#10b981" strokeWidth="2" />
        </g>

        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b7280" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}
