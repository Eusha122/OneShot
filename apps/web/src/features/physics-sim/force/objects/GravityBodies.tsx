import React from "react";
import { ForceState } from "../engine/ForceState";
import { Particle } from "./Particle";
import { ForceVector } from "./ForceVector";

interface GravityBodiesProps {
  state: ForceState;
  time: number; // 0 to 1
}

export function GravityBodies({ state, time }: GravityBodiesProps) {
  if (!state.particles || state.particles.length < 2) return null;

  const [p1, p2] = state.particles;
  const cx = 320;
  const cy = 110;
  
  // Distance scale
  const distancePx = (state.distance || 5) * 15;
  const x1 = cx - distancePx / 2;
  const x2 = cx + distancePx / 2;

  return (
    <g>
      {/* Background stars (optional space aesthetic) */}
      <circle cx={cx} cy={cy} r="200" fill="radial-gradient(circle, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0) 70%)" />
      
      {/* Distance Line */}
      <line x1={x1} y1={cy} x2={x2} y2={cy} stroke="#4b5563" strokeWidth="1" strokeDasharray="4,4" />
      <text x={cx} y={cy - 10} fill="#9ca3af" fontSize="12" textAnchor="middle">r = {state.distance}m</text>

      {/* Body 1 */}
      <Particle particle={p1} x={x1} y={cy} color="#f59e0b" glowColor="rgba(245, 158, 11, 0.4)" />
      {/* Force Vector 1 (pulls towards p2) */}
      <ForceVector 
        x={x1 + 15} 
        y={cy} 
        magnitude={state.force || 0} 
        direction="right" 
        color="#ef4444" 
        scale={0.05} // Needs careful scaling as force can get very large due to inverse square
        label={`F`} 
      />

      {/* Body 2 */}
      <Particle particle={p2} x={x2} y={cy} color="#3b82f6" glowColor="rgba(59, 130, 246, 0.4)" />
      {/* Force Vector 2 (pulls towards p1) */}
      <ForceVector 
        x={x2 - 15} 
        y={cy} 
        magnitude={state.force || 0} 
        direction="left" 
        color="#ef4444" 
        scale={0.05} 
        label={`F`} 
      />
    </g>
  );
}
