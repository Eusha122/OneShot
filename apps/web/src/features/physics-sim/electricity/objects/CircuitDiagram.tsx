import React, { forwardRef, useImperativeHandle, useRef } from "react";
import type { PhysicsLabParams } from "../../sscPhysicsEngine";

interface CircuitDiagramProps {
  params: PhysicsLabParams;
  current: number;
  resistance: number;
}

export interface CircuitDiagramRef {
  updateTimeFrac: (timeFrac: number) => void;
}

export const CircuitDiagram = forwardRef<CircuitDiagramRef, CircuitDiagramProps>(({
  params,
  current,
  resistance,
}, ref) => {
  const isSeries = params.formulaId === "series-resistance";
  const isParallel = params.formulaId === "parallel-resistance";

  const numDots = 4;
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);

  // Helper to map progress along a simple rectangular path
  const circuitPoint = (p: number) => {
    const total = 1032; // 380 + 136 + 380 + 136
    const d = p * total;
    if (d < 380) return { x: 130 + d, y: 78 };
    if (d < 380 + 136) return { x: 510, y: 78 + (d - 380) };
    if (d < 380 + 136 + 380) return { x: 510 - (d - 516), y: 214 };
    return { x: 130, y: 214 - (d - 896) };
  };

  useImperativeHandle(ref, () => ({
    updateTimeFrac: (timeFrac: number) => {
      // timeFrac goes from 0 to 1 based on whatever duration the engine is using.
      // But for a continuous circuit, we can just use it directly.
      const speed = current * 0.5;
      // Convert the 0-1 timeFrac into continuous looping progress
      // (Since it resets to 0 every loop, we just use it directly as progress)
      const adjustedProgress = (timeFrac * speed) % 1;
      
      const offsets = [0, 0.25, 0.5, 0.75];
      for (let i = 0; i < numDots; i++) {
        const circle = dotRefs.current[i];
        if (!circle) continue;
        
        if (current === 0) {
          circle.style.display = "none";
          continue;
        }
        
        circle.style.display = "";
        const pos = (adjustedProgress + offsets[i]) % 1;
        const point = circuitPoint(pos);
        
        circle.setAttribute("cx", String(point.x));
        circle.setAttribute("cy", String(point.y));
      }
    }
  }));

  // Initial dummy dots
  const initialDots = [];
  for (let i = 0; i < numDots; i++) {
    initialDots.push(
      <circle 
        key={i} 
        ref={(el) => { dotRefs.current[i] = el; }} 
        cx="-100" cy="-100" 
        r="5" 
        fill="#fcd34d" 
        style={{ display: current > 0 ? "" : "none" }}
      />
    );
  }

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
      {initialDots}

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
});
