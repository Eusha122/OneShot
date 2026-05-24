import React from "react";
import { MotionState } from "../engine/MotionState";

interface ParticleObjectProps {
  state: MotionState;
  time: number; // current playback time (0 to 1 usually, or actual seconds)
  duration: number; // total duration
  formulaId: string;
}

export function ParticleObject({ state, time, duration, formulaId }: ParticleObjectProps) {
  // We compute the current position of the particle based on time.
  // Physical time t progresses from 0 to state.t.
  const t = time * state.t;
  
  // Calculate current displacement at time t
  // s(t) = ut + 1/2 a t^2
  let currentS = state.u * t + 0.5 * state.a * t * t;
  
  // For 'velocity' formula (v=s/t), a=0, so currentS = v * t
  if (formulaId === "velocity") {
    currentS = state.v * t;
  }

  // Visual scaling to fit into SVG viewport.
  // Assume viewport is 640x220, track length is ~500px, corresponding to total displacement state.s
  const trackLength = 500;
  const startX = 70;
  
  // Scale factor: how many pixels per unit of displacement
  const scale = state.s !== 0 ? trackLength / Math.max(1, Math.abs(state.s)) : 0;
  
  const cx = startX + currentS * scale;
  const cy = 140; // Track y-level

  // Velocity calculation for vector
  const currentV = state.u + state.a * t;
  const vectorLength = currentV * 10;

  return (
    <g>
      {/* Track */}
      <line x1="40" y1={cy + 15} x2="600" y2={cy + 15} stroke="#374151" strokeWidth="2" strokeDasharray="5,5" />
      <line x1={startX} y1={cy + 5} x2={startX} y2={cy + 25} stroke="#9ca3af" strokeWidth="2" />
      <text x={startX} y={cy + 40} fill="#9ca3af" fontSize="10" textAnchor="middle">0</text>
      
      {state.s !== 0 && (
        <>
          <line x1={startX + state.s * scale} y1={cy + 5} x2={startX + state.s * scale} y2={cy + 25} stroke="#9ca3af" strokeWidth="2" />
          <text x={startX + state.s * scale} y={cy + 40} fill="#9ca3af" fontSize="10" textAnchor="middle">{state.s.toFixed(1)}m</text>
        </>
      )}

      {/* Particle Glow */}
      <circle cx={cx} cy={cy} r="20" fill="url(#particleGlow)" opacity="0.5" />
      
      {/* Particle Core */}
      <circle cx={cx} cy={cy} r="10" fill="#f8fafc" />
      <circle cx={cx} cy={cy} r="8" fill="#3b82f6" />
      
      <defs>
        <radialGradient id="particleGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
      </defs>
    </g>
  );
}
