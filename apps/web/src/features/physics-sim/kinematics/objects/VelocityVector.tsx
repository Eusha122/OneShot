import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { MotionState } from "../engine/MotionState";

interface VelocityVectorProps {
  state: MotionState;
  formulaId: string;
}

export interface VelocityVectorRef {
  updateTimeFrac: (timeFrac: number) => void;
}

export const VelocityVector = forwardRef<VelocityVectorRef, VelocityVectorProps>(({ state, formulaId }, ref) => {
  const lineRef = useRef<SVGLineElement>(null);
  const textRef = useRef<SVGTextElement>(null);
  const groupRef = useRef<SVGGElement>(null);

  const trackLength = 500;
  const startX = 70;
  const scale = state.s !== 0 ? trackLength / Math.max(1, Math.abs(state.s)) : 0;
  const cy = 140;

  useImperativeHandle(ref, () => ({
    updateTimeFrac: (timeFrac: number) => {
      if (!lineRef.current || !textRef.current || !groupRef.current) return;
      
      const t = timeFrac * state.t;
      let currentV = state.u + state.a * t;
      let currentS = state.u * t + 0.5 * state.a * t * t;
      
      if (formulaId === "velocity") {
        currentV = state.v; // Constant velocity
        currentS = state.v * t;
      }

      const cx = startX + currentS * scale;
      
      // Vector length based on velocity
      const vScale = 3;
      const vectorLength = Math.min(100, Math.max(-100, currentV * vScale));
      
      if (vectorLength === 0) {
        groupRef.current.style.display = "none";
      } else {
        groupRef.current.style.display = "";
        
        // GPU accelerated translate
        groupRef.current.style.transform = `translate3d(${cx}px, 0px, 0)`;
        
        // Update arrow length and text
        lineRef.current.setAttribute("x2", String(vectorLength));
        textRef.current.setAttribute("x", String(vectorLength / 2));
        textRef.current.textContent = `v = ${currentV.toFixed(1)} m/s`;
      }
    }
  }));

  // Initial render at cx=0, vectorLength=0.
  return (
    <g ref={groupRef} style={{ transform: `translate3d(${startX}px, 0px, 0)` }}>
      {/* Arrow shaft */}
      <line 
        ref={lineRef}
        x1="0" y1={cy - 35} 
        x2="0" y2={cy - 35} 
        stroke="#10b981" strokeWidth="3" 
        markerEnd="url(#arrowHeadV)" 
      />
      {/* Label */}
      <text ref={textRef} x="0" y={cy - 45} fill="#10b981" fontSize="12" textAnchor="middle" fontWeight="bold">
        v = 0.0 m/s
      </text>

      <defs>
        <marker id="arrowHeadV" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M 0 0 L 6 3 L 0 6 z" fill="#10b981" />
        </marker>
      </defs>
    </g>
  );
});
