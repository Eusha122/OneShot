import React from "react";
import { MotionState } from "../engine/MotionState";

interface MotionTrailProps {
  state: MotionState;
  time: number;
  formulaId: string;
}

export function MotionTrail({ state, time, formulaId }: MotionTrailProps) {
  const numTrails = 10;
  const trails = [];

  const trackLength = 500;
  const startX = 70;
  const scale = state.s !== 0 ? trackLength / Math.max(1, Math.abs(state.s)) : 0;
  const cy = 140;

  for (let i = 1; i <= numTrails; i++) {
    const historicalTime = Math.max(0, time - (i * 0.05));
    const t = historicalTime * state.t;
    
    let currentS = state.u * t + 0.5 * state.a * t * t;
    if (formulaId === "velocity") {
      currentS = state.v * t;
    }

    const cx = startX + currentS * scale;
    const opacity = 0.4 * (1 - i / numTrails);

    trails.push(
      <circle key={i} cx={cx} cy={cy} r="6" fill="#3b82f6" opacity={opacity} />
    );
  }

  return <g>{trails}</g>;
}
