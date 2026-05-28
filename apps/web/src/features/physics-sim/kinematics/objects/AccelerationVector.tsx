import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { MotionState } from "../engine/MotionState";

interface AccelerationVectorProps {
  state: MotionState;
  formulaId: string;
}

export interface AccelerationVectorRef {
  updateTimeFrac: (timeFrac: number) => void;
}

export const AccelerationVector = forwardRef<AccelerationVectorRef, AccelerationVectorProps>(({ state, formulaId }, ref) => {
  const groupRef = useRef<SVGGElement>(null);
  const trackLength = 500;
  const startX = 70;
  const scale = state.s !== 0 ? trackLength / Math.max(1, Math.abs(state.s)) : 0;
  const cy = 140;

  useImperativeHandle(ref, () => ({
    updateTimeFrac: (timeFrac: number) => {
      if (!groupRef.current) return;
      
      const t = timeFrac * state.t;
      const currentS = state.u * t + 0.5 * state.a * t * t;
      const cx = startX + currentS * scale;
      
      if (state.a === 0 || formulaId === "velocity") {
        groupRef.current.style.display = "none";
      } else {
        groupRef.current.style.display = "";
        groupRef.current.style.transform = `translate3d(${cx}px, 0px, 0)`;
      }
    }
  }));

  const aScale = 5;
  const vectorLength = Math.min(80, Math.max(-80, state.a * aScale));
  
  // Start at cx=0, we'll translate it.
  return (
    <g ref={groupRef} style={{ transform: `translate3d(${startX}px, 0px, 0)` }}>
      <line 
        x1="0" y1={cy + 40} 
        x2={vectorLength} y2={cy + 40} 
        stroke="#f59e0b" strokeWidth="2" 
        strokeDasharray="4,2"
        markerEnd="url(#arrowHeadA)" 
      />
      <text x={vectorLength / 2} y={cy + 55} fill="#f59e0b" fontSize="10" textAnchor="middle" fontWeight="bold">
        a = {state.a.toFixed(1)} m/s²
      </text>

      <defs>
        <marker id="arrowHeadA" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M 0 0 L 6 3 L 0 6 z" fill="#f59e0b" />
        </marker>
      </defs>
    </g>
  );
});
