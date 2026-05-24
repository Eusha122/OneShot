import React from "react";
import { MotionState } from "../engine/MotionState";

interface VelocityVectorProps {
  state: MotionState;
  time: number;
  formulaId: string;
}

export function VelocityVector({ state, time, formulaId }: VelocityVectorProps) {
  const t = time * state.t;
  let currentV = state.u + state.a * t;
  
  if (formulaId === "velocity") {
    currentV = state.v; // Constant velocity
  }

  // Same scaling as particle
  let currentS = state.u * t + 0.5 * state.a * t * t;
  if (formulaId === "velocity") {
    currentS = state.v * t;
  }

  const trackLength = 500;
  const startX = 70;
  const scale = state.s !== 0 ? trackLength / Math.max(1, Math.abs(state.s)) : 0;
  
  const cx = startX + currentS * scale;
  const cy = 140;

  // Vector length based on velocity (cap for visual sanity)
  const vScale = 3;
  const vectorLength = Math.min(100, Math.max(-100, currentV * vScale));
  
  if (vectorLength === 0) return null;

  return (
    <g>
      {/* Arrow shaft */}
      <line 
        x1={cx} y1={cy - 35} 
        x2={cx + vectorLength} y2={cy - 35} 
        stroke="#10b981" strokeWidth="3" 
        markerEnd="url(#arrowHeadV)" 
      />
      {/* Label */}
      <text x={cx + vectorLength / 2} y={cy - 45} fill="#10b981" fontSize="12" textAnchor="middle" fontWeight="bold">
        v = {currentV.toFixed(1)} m/s
      </text>

      <defs>
        <marker id="arrowHeadV" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M 0 0 L 6 3 L 0 6 z" fill="#10b981" />
        </marker>
      </defs>
    </g>
  );
}
