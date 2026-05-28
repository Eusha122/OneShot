import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { MotionState } from "../engine/MotionState";

interface MotionTrailProps {
  state: MotionState;
  formulaId: string;
}

export interface MotionTrailRef {
  updateTimeFrac: (timeFrac: number) => void;
}

export const MotionTrail = forwardRef<MotionTrailRef, MotionTrailProps>(({ state, formulaId }, ref) => {
  const numTrails = 10;
  // Store an array of refs for the circles
  const circleRefs = useRef<(SVGCircleElement | null)[]>([]);

  const trackLength = 500;
  const startX = 70;
  const scale = state.s !== 0 ? trackLength / Math.max(1, Math.abs(state.s)) : 0;
  const cy = 140;

  useImperativeHandle(ref, () => ({
    updateTimeFrac: (timeFrac: number) => {
      for (let i = 1; i <= numTrails; i++) {
        const circle = circleRefs.current[i - 1];
        if (!circle) continue;
        
        const historicalTime = Math.max(0, timeFrac - (i * 0.05));
        const t = historicalTime * state.t;
        
        let currentS = state.u * t + 0.5 * state.a * t * t;
        if (formulaId === "velocity") {
          currentS = state.v * t;
        }

        const cx = startX + currentS * scale;
        circle.setAttribute("cx", String(cx));
      }
    }
  }));

  const trails = [];
  for (let i = 1; i <= numTrails; i++) {
    const opacity = 0.4 * (1 - i / numTrails);
    trails.push(
      <circle 
        key={i} 
        ref={(el) => { circleRefs.current[i - 1] = el; }} 
        cx={startX} 
        cy={cy} 
        r="6" 
        fill="#3b82f6" 
        opacity={opacity} 
      />
    );
  }

  return <g>{trails}</g>;
});
