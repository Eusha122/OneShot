import React from "react";
import { MotionState } from "../engine/MotionState";

interface AccelerationVectorProps {
  state: MotionState;
  time: number;
  formulaId: string;
}

export function AccelerationVector({ state, time, formulaId }: AccelerationVectorProps) {
  if (state.a === 0 || formulaId === "velocity") return null;

  const t = time * state.t;
  const currentS = state.u * t + 0.5 * state.a * t * t;

  const trackLength = 500;
  const startX = 70;
  const scale = state.s !== 0 ? trackLength / Math.max(1, Math.abs(state.s)) : 0;
  
  const cx = startX + currentS * scale;
  const cy = 140;

  const aScale = 5;
  const vectorLength = Math.min(80, Math.max(-80, state.a * aScale));

  return (
    <g>
      <line 
        x1={cx} y1={cy + 40} 
        x2={cx + vectorLength} y2={cy + 40} 
        stroke="#f59e0b" strokeWidth="2" 
        strokeDasharray="4,2"
        markerEnd="url(#arrowHeadA)" 
      />
      <text x={cx + vectorLength / 2} y={cy + 55} fill="#f59e0b" fontSize="10" textAnchor="middle" fontWeight="bold">
        a = {state.a.toFixed(1)} m/s²
      </text>

      <defs>
        <marker id="arrowHeadA" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M 0 0 L 6 3 L 0 6 z" fill="#f59e0b" />
        </marker>
      </defs>
    </g>
  );
}
