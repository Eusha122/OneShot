import React from "react";
import { ForceState } from "../engine/ForceState";
import { Particle } from "./Particle";
import { ForceVector } from "./ForceVector";

interface CircularOrbitProps {
  state: ForceState;
  time: number; // 0 to 1
}

export function CircularOrbit({ state, time }: CircularOrbitProps) {
  const currentT = time * (state.time || 1);
  
  const cx = 320;
  const cy = 110;
  const radius = (state.radius || 10) * 5; // Scale radius
  
  // v = r * w => w = v / r
  const angularVelocity = (state.velocity || 0) / (state.radius || 1);
  const currentAngle = angularVelocity * currentT; // in radians
  
  // Particle position
  const px = cx + radius * Math.cos(currentAngle);
  const py = cy + radius * Math.sin(currentAngle);
  
  // Angle in degrees for vectors
  const angleDeg = currentAngle * (180 / Math.PI);

  return (
    <g>
      {/* Orbit path */}
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#374151" strokeWidth="2" strokeDasharray="6,6" />
      
      {/* Center mass (pivot) */}
      <circle cx={cx} cy={cy} r="6" fill="#f59e0b" />
      <text x={cx} y={cy + 20} fill="#f59e0b" fontSize="10" textAnchor="middle">Pivot</text>
      
      {/* Radius line */}
      <line x1={cx} y1={cy} x2={px} y2={py} stroke="#6b7280" strokeWidth="1" strokeDasharray="3,3" />

      {/* Particle */}
      <Particle particle={{ mass: state.mass || 1, velocity: state.velocity || 0, position: 0 }} x={px} y={py} color="#8b5cf6" glowColor="rgba(139, 92, 246, 0.4)" />

      {/* Tangential Velocity Vector */}
      <ForceVector 
        x={px} 
        y={py} 
        magnitude={state.velocity || 0} 
        direction={angleDeg + 90} 
        color="#10b981" 
        scale={3} 
        label={`v`} 
      />

      {/* Centripetal Force Vector (points to center) */}
      <ForceVector 
        x={px} 
        y={py} 
        magnitude={state.force || 0} 
        direction={angleDeg + 180} 
        color="#ef4444" 
        scale={2} 
        label={`Fc`} 
      />
    </g>
  );
}
