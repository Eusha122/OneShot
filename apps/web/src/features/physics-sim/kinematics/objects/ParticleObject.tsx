import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { MotionState } from "../engine/MotionState";

interface ParticleObjectProps {
  state: MotionState;
  duration: number; // total duration
  formulaId: string;
}

export interface ParticleObjectRef {
  updateTimeFrac: (timeFrac: number) => void;
}

export const ParticleObject = forwardRef<ParticleObjectRef, ParticleObjectProps>(({ state, duration, formulaId }, ref) => {
  const groupRef = useRef<SVGGElement>(null);
  
  const trackLength = 500;
  const startX = 70;
  const scale = state.s !== 0 ? trackLength / Math.max(1, Math.abs(state.s)) : 0;
  const cy = 140;

  useImperativeHandle(ref, () => ({
    updateTimeFrac: (timeFrac: number) => {
      if (!groupRef.current) return;
      const t = timeFrac * state.t;
      let currentS = state.u * t + 0.5 * state.a * t * t;
      if (formulaId === "velocity") currentS = state.v * t;
      
      const cx = startX + currentS * scale;
      // GPU accelerated translate instead of recalculating all circle cx/cy
      groupRef.current.style.transform = `translate3d(${cx}px, 0px, 0)`;
    }
  }));

  // Initial position for SSR/first paint (timeFrac = 0 => cx = startX)
  // Wait, if transform is translate(cx), the circles should be drawn at cx=0!
  return (
    <g>
      {/* Static Track */}
      <line x1="40" y1={cy + 15} x2="600" y2={cy + 15} stroke="#374151" strokeWidth="2" strokeDasharray="5,5" />
      <line x1={startX} y1={cy + 5} x2={startX} y2={cy + 25} stroke="#9ca3af" strokeWidth="2" />
      <text x={startX} y={cy + 40} fill="#9ca3af" fontSize="10" textAnchor="middle">0</text>
      
      {state.s !== 0 && (
        <>
          <line x1={startX + state.s * scale} y1={cy + 5} x2={startX + state.s * scale} y2={cy + 25} stroke="#9ca3af" strokeWidth="2" />
          <text x={startX + state.s * scale} y={cy + 40} fill="#9ca3af" fontSize="10" textAnchor="middle">{state.s.toFixed(1)}m</text>
        </>
      )}

      {/* Moving Particle Group. Drawn at cx=0 initially. Transform moves it. */}
      <g ref={groupRef} style={{ transform: `translate3d(${startX}px, 0px, 0)` }}>
        <circle cx="0" cy={cy} r="20" fill="url(#particleGlow)" opacity="0.5" />
        <circle cx="0" cy={cy} r="10" fill="#f8fafc" />
        <circle cx="0" cy={cy} r="8" fill="#3b82f6" />
      </g>
      
      <defs>
        <radialGradient id="particleGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
      </defs>
    </g>
  );
});
