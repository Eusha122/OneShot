import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { ForceState } from "../engine/ForceState";
import { ForceVector } from "./ForceVector";

interface MassBlockProps {
  state: ForceState;
}

export interface MassBlockRef {
  updateTimeFrac: (timeFrac: number) => void;
}

export const MassBlock = forwardRef<MassBlockRef, MassBlockProps>(({ state }, ref) => {
  const groupRef = useRef<SVGGElement>(null);

  // Base constants
  const startX = 80;
  const cy = 160;
  
  // Scale
  const trackLength = 400;
  const maxDisplacement = Math.max(1, (state.position || 10));
  const scale = trackLength / maxDisplacement;
  
  // Block size scales with mass
  const baseSize = 40;
  const size = baseSize + Math.log10(Math.max(1, state.mass || 1)) * 15;

  useImperativeHandle(ref, () => ({
    updateTimeFrac: (timeFrac: number) => {
      if (!groupRef.current) return;
      const currentT = timeFrac * (state.time || 1);
      
      // Calculate visual position
      // s = ut + 0.5 a t^2
      const u = state.velocity! - (state.acceleration || 0) * (state.time || 0);
      const s = u * currentT + 0.5 * (state.acceleration || 0) * currentT * currentT;
      
      const blockX = startX + s * scale;
      
      groupRef.current.style.transform = `translate3d(${blockX}px, 0px, 0)`;
    }
  }));

  // Initial render at startX. Everything inside group is relative to blockX=0
  return (
    <g>
      {/* Track */}
      <line x1="40" y1={cy} x2="600" y2={cy} stroke="#374151" strokeWidth="4" />
      
      {/* Moving Block Group */}
      <g ref={groupRef} style={{ transform: `translate3d(${startX}px, 0px, 0)` }}>
        <rect 
          x={-size / 2} 
          y={cy - size} 
          width={size} 
          height={size} 
          fill="#1e293b" 
          stroke="#3b82f6" 
          strokeWidth="3" 
          rx="4" 
        />
        <text x={0} y={cy - size / 2 + 5} fill="#f8fafc" fontSize="14" fontWeight="bold" textAnchor="middle">
          {state.mass}kg
        </text>

        {/* Force Vector (applied force) */}
        {(state.force || 0) > 0 && (
          <ForceVector 
            x={-size / 2 - 10} 
            y={cy - size / 2} 
            magnitude={state.force || 0} 
            direction="right" 
            label={`F = ${state.force}N`} 
            color="#ef4444" 
            scale={1.5}
          />
        )}
        
        {/* Velocity Vector */}
        {(state.velocity || 0) > 0 && (
          <ForceVector 
            x={size / 2 + 5} 
            y={cy - size / 2} 
            magnitude={state.velocity || 0} 
            direction="right" 
            label={`v = ${state.velocity?.toFixed(1)}m/s`} 
            color="#10b981" 
            scale={2}
          />
        )}
      </g>
    </g>
  );
});
