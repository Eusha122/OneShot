import React from "react";
import { ForceState } from "../engine/ForceState";

interface GraphProps {
  state: ForceState;
  time: number; // 0 to 1
  formulaId: string;
}

export function ForceGraphs({ state, time, formulaId }: GraphProps) {
  const width = 640;
  const height = 280;
  const padding = 50;
  const gWidth = width - padding * 2;
  const gHeight = height - padding * 2;

  let yLabel = "Force (N)";
  let xLabel = "Time (s)";
  let graphTitle = "Force vs Time";
  let graphMath = "F = f(t)";
  
  let getX: (t: number) => number = () => padding;
  let getY: (v: number) => number = () => padding + gHeight;
  let points: string[] = [];
  let cx = padding;
  let cy = padding + gHeight;
  let maxDomain = 10;
  let maxRange = 100;

  // Configure specific graphs based on formula
  if (formulaId === "newton-second-law") {
    // F vs a (linear)
    yLabel = "Force (N)";
    xLabel = "Acceleration (m/s²)";
    graphTitle = "Force vs Acceleration";
    graphMath = "F = ma";
    maxDomain = Math.max(5, state.acceleration || 5) * 1.5;
    maxRange = Math.max(10, state.force || 10) * 1.5;
    
    getX = (a) => padding + (a / maxDomain) * gWidth;
    getY = (f) => padding + gHeight - (f / maxRange) * gHeight;
    
    // Constant slope m
    points = [`${getX(0)},${getY(0)}`, `${getX(maxDomain)},${getY((state.mass || 1) * maxDomain)}`];
    cx = getX(state.acceleration || 0);
    cy = getY(state.force || 0);
  } else if (formulaId === "momentum") {
    // p vs t (constant momentum since v is constant here)
    yLabel = "Momentum (kg·m/s)";
    xLabel = "Time (s)";
    graphTitle = "Momentum vs Time";
    graphMath = "p = mv";
    maxDomain = Math.max(1, state.time || 1);
    maxRange = Math.max(10, state.momentum || 10) * 1.5;
    
    getX = (t) => padding + (t / maxDomain) * gWidth;
    getY = (p) => padding + gHeight - (p / maxRange) * gHeight;
    
    points = [`${getX(0)},${getY(state.momentum || 0)}`, `${getX(maxDomain)},${getY(state.momentum || 0)}`];
    cx = getX(time * maxDomain);
    cy = getY(state.momentum || 0);
  } else if (formulaId === "gravitational-force") {
    // F vs r (inverse square)
    yLabel = "Force (N)";
    xLabel = "Distance r (m)";
    graphTitle = "Force vs Distance";
    graphMath = "F ∝ 1/r²";
    maxDomain = 20;
    
    // visualG is 1000 in our calc
    const m1 = state.particles?.[0]?.mass || 5;
    const m2 = state.particles?.[1]?.mass || 10;
    maxRange = (1000 * m1 * m2) / (1 * 1); // F at r=1 is very high
    // We scale range visually to not flatten the curve
    maxRange = Math.max(100, state.force || 100) * 2;

    getX = (r) => padding + (r / maxDomain) * gWidth;
    getY = (f) => padding + gHeight - (f / maxRange) * gHeight;
    
    // Generate inverse square points
    for (let r = 1; r <= maxDomain; r += 0.5) {
      const f = (1000 * m1 * m2) / (r * r);
      points.push(`${getX(r)},${getY(Math.min(f, maxRange))}`);
    }
    
    cx = getX(state.distance || 5);
    cy = getY(state.force || 0);
  } else if (formulaId === "impulse") {
    // Force vs time spike
    yLabel = "Force (N)";
    xLabel = "Time (s)";
    graphTitle = "Force vs Time (Impulse)";
    graphMath = "J = ∫F dt";
    maxDomain = Math.max(1, state.time || 1);
    maxRange = Math.max(10, state.force || 10) * 1.5;
    
    getX = (t) => padding + (t / maxDomain) * gWidth;
    getY = (f) => padding + gHeight - (f / maxRange) * gHeight;
    
    // Force is applied over time duration state.time
    points = [
      `${getX(0)},${getY(0)}`, 
      `${getX(maxDomain * 0.1)},${getY(state.force || 0)}`,
      `${getX(maxDomain * 0.9)},${getY(state.force || 0)}`,
      `${getX(maxDomain)},${getY(0)}`
    ];
    
    cx = getX(time * maxDomain);
    const isImpacting = time > 0.1 && time < 0.9;
    cy = getY(isImpacting ? (state.force || 0) : 0);
  } else if (formulaId === "conservation") {
    // Total Momentum vs Time
    yLabel = "Total Momentum";
    xLabel = "Time (s)";
    graphTitle = "Conservation of Momentum";
    graphMath = "Σp = constant";
    
    const p1 = state.particles?.[0];
    const p2 = state.particles?.[1];
    // Need initial velocities ideally, but total momentum is conserved
    const totalP = (p1?.mass || 0) * (p1?.velocity || 0) + (p2?.mass || 0) * (p2?.velocity || 0);
    
    maxDomain = Math.max(1, state.time || 1);
    maxRange = Math.max(10, Math.abs(totalP)) * 2;
    
    getX = (t) => padding + (t / maxDomain) * gWidth;
    getY = (p) => padding + gHeight / 2 - (p / maxRange) * (gHeight / 2); // Center Y for positive/negative momentum
    
    points = [`${getX(0)},${getY(totalP)}`, `${getX(maxDomain)},${getY(totalP)}`];
    cx = getX(time * maxDomain);
    cy = getY(totalP);
  } else if (formulaId === "centripetal") {
    // Force vs velocity (quadratic) F = mv^2 / r
    yLabel = "Centripetal Force (N)";
    xLabel = "Velocity (m/s)";
    graphTitle = "Force vs Velocity";
    graphMath = "F ∝ v²";
    
    maxDomain = Math.max(5, state.velocity || 5) * 1.5;
    maxRange = Math.max(10, state.force || 10) * 1.5;
    
    getX = (v) => padding + (v / maxDomain) * gWidth;
    getY = (f) => padding + gHeight - (f / maxRange) * gHeight;
    
    for (let v = 0; v <= maxDomain; v += maxDomain / 20) {
      const f = ((state.mass || 1) * v * v) / (state.radius || 1);
      points.push(`${getX(v)},${getY(Math.min(f, maxRange))}`);
    }
    
    cx = getX(state.velocity || 0);
    cy = getY(state.force || 0);
  }

  const zeroY = formulaId === "conservation" ? padding + gHeight / 2 : padding + gHeight;

  return (
    <div className="mt-4 rounded-md border border-[#2a2a2a] bg-[#111111] overflow-hidden drop-shadow-md">
      <div className="bg-[#1f1f1f] px-3 py-2 border-b border-[#2a2a2a] flex justify-between items-center">
        <span className="text-xs font-semibold text-gray-300">{graphTitle}</span>
        <span className="text-[10px] font-mono text-emerald-400 bg-black/40 px-2 py-0.5 rounded">{graphMath}</span>
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
        <line x1={padding} y1={height - padding + 10} x2={padding} y2={padding - 15} stroke="#6b7280" strokeWidth="2" markerEnd="url(#arrow)" />
        <line x1={padding - 10} y1={zeroY} x2={width - padding + 15} y2={zeroY} stroke="#6b7280" strokeWidth="2" markerEnd="url(#arrow)" />

        {/* Labels */}
        <text x={padding - 35} y={height / 2} fill="#9ca3af" fontSize="12" textAnchor="middle" transform={`rotate(-90, ${padding - 35}, ${height / 2})`}>
          {yLabel}
        </text>
        <text x={width / 2} y={zeroY + 20} fill="#9ca3af" fontSize="12" textAnchor="middle">
          {xLabel}
        </text>

        {/* Origin */}
        <text x={padding - 12} y={zeroY + 15} fill="#6b7280" fontSize="12" textAnchor="middle">O</text>

        {/* Plot Line */}
        {points.length > 0 && (
          <polyline points={points.join(" ")} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
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
