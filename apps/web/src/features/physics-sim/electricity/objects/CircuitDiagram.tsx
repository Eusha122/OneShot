import React from "react";
import type { PhysicsLabParams } from "../../sscPhysicsEngine";

export function CircuitDiagram({
  params,
  progress,
  current,
  resistance,
}: {
  params: PhysicsLabParams;
  progress: number;
  current: number;
  resistance: number;
}) {
  const isSeries = params.formulaId === "series-resistance";
  const isParallel = params.formulaId === "parallel-resistance";

  // Dots for electron flow (flowing from negative to positive, or conventional from + to -)
  // Let's use conventional current from left(+) to right(-) for simplicity
  const speed = current * 0.5; // Visual speed scales with current
  const adjustedProgress = (progress * speed) % 1;
  const dotPositions = [0, 0.25, 0.5, 0.75].map((offset) => (adjustedProgress + offset) % 1);

  // Helper to map progress along a simple rectangular path
  const circuitPoint = (p: number) => {
    // Top: 130 to 510 (length 380)
    // Right: 78 to 214 (length 136)
    // Bottom: 510 to 130 (length 380)
    // Left: 214 to 78 (length 136)
    const total = 380 + 136 + 380 + 136; // 1032
    const d = p * total;
    if (d < 380) return { x: 130 + d, y: 78 };
    if (d < 380 + 136) return { x: 510, y: 78 + (d - 380) };
    if (d < 380 + 136 + 380) return { x: 510 - (d - 516), y: 214 };
    return { x: 130, y: 214 - (d - 896) };
  };

  return (
    <g>
      {/* Background glow */}
      <circle cx="512" cy="78" r="72" fill="rgba(255,59,48,0.035)" />
      <circle cx="130" cy="214" r="88" fill="rgba(96,165,250,0.035)" />

      {/* Main Wire Loop */}
      <path d="M130 78 H510 V214 H130 Z" fill="none" stroke="rgba(255,255,255,0.34)" strokeWidth="4" />

      {/* Power Source (Battery) on the left vertical wire */}
      <rect x="110" y="130" width="40" height="32" fill="#0d1117" />
      <line x1="110" x2="150" y1="138" y2="138" stroke="#f5f5f5" strokeWidth="5" />
      <line x1="120" x2="140" y1="154" y2="154" stroke="#f5f5f5" strokeWidth="3" />
      <text x="80" y="150" className="fill-[#fcd34d] font-mono text-[12px]">{params.voltage}V</text>
      <text x="130" y="125" className="fill-white text-[10px]">+</text>
      <text x="130" y="175" className="fill-white text-[10px]">-</text>

      {/* Resistors on the top horizontal wire */}
      {isSeries ? (
        <>
          {/* R1 */}
          <rect x="250" y="66" width="40" height="24" fill="#1f2937" stroke="#ff3b30" strokeWidth="2" />
          <text x="270" y="82" textAnchor="middle" className="fill-white text-[10px]">R₁</text>
          {/* R2 */}
          <rect x="350" y="66" width="40" height="24" fill="#1f2937" stroke="#ff3b30" strokeWidth="2" />
          <text x="370" y="82" textAnchor="middle" className="fill-white text-[10px]">R₂</text>
        </>
      ) : isParallel ? (
        <>
          {/* Split the wire for parallel */}
          <rect x="280" y="66" width="80" height="24" fill="#0d1117" />
          {/* Top branch */}
          <path d="M280 78 V48 H360 V78" fill="none" stroke="rgba(255,255,255,0.34)" strokeWidth="4" />
          <rect x="300" y="36" width="40" height="24" fill="#1f2937" stroke="#ff3b30" strokeWidth="2" />
          <text x="320" y="52" textAnchor="middle" className="fill-white text-[10px]">R₁</text>
          {/* Bottom branch */}
          <path d="M280 78 V108 H360 V78" fill="none" stroke="rgba(255,255,255,0.34)" strokeWidth="4" />
          <rect x="300" y="96" width="40" height="24" fill="#1f2937" stroke="#ff3b30" strokeWidth="2" />
          <text x="320" y="112" textAnchor="middle" className="fill-white text-[10px]">R₂</text>
        </>
      ) : (
        <>
          {/* Single Resistor */}
          <rect x="300" y="66" width="40" height="24" fill="#1f2937" stroke="#ff3b30" strokeWidth="2" />
          <text x="320" y="82" textAnchor="middle" className="fill-white text-[10px]">R</text>
        </>
      )}

      {/* Moving Charges (Current Flow) */}
      {current > 0 && dotPositions.map((position, index) => {
        const point = circuitPoint(position);
        return <circle key={index} cx={point.x} cy={point.y} r="5" fill="#fcd34d" />;
      })}

      {/* Ammeter / Labels */}
      <circle cx="510" cy="146" r="16" fill="#1f2937" stroke="#60a5fa" strokeWidth="2" />
      <text x="510" y="150" textAnchor="middle" className="fill-[#60a5fa] font-bold text-[12px]">A</text>
      <text x="540" y="150" className="fill-white text-[12px]">{current.toFixed(2)} A</text>
      
      <text x="320" y="40" textAnchor="middle" className="fill-[#9ca3af] text-[11px]">
        {isSeries ? "Series Circuit" : isParallel ? "Parallel Circuit" : "Simple Circuit"}
      </text>
      <text x="320" y="240" textAnchor="middle" className="fill-[#9ca3af] text-[11px]">
        Total Resistance: {resistance.toFixed(2)} Ω
      </text>
    </g>
  );
}
