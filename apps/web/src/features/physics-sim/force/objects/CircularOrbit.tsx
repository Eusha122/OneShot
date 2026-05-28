import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { ForceState } from "../engine/ForceState";
import { Particle } from "./Particle";
import { ForceVector } from "./ForceVector";

interface CircularOrbitProps {
  state: ForceState;
}

export interface CircularOrbitRef {
  updateTimeFrac: (timeFrac: number) => void;
}

export const CircularOrbit = forwardRef<CircularOrbitRef, CircularOrbitProps>(({ state }, ref) => {
  const groupRef = useRef<SVGGElement>(null);

  const cx = 320;
  const cy = 110;
  const radius = (state.radius || 10) * 5; // Scale radius
  const angularVelocity = (state.velocity || 0) / (state.radius || 1);

  useImperativeHandle(ref, () => ({
    updateTimeFrac: (timeFrac: number) => {
      if (!groupRef.current) return;
      const currentT = timeFrac * (state.time || 1);
      const currentAngle = angularVelocity * currentT; // in radians
      const angleDeg = currentAngle * (180 / Math.PI);
      
      groupRef.current.style.transform = `translate(${cx}px, ${cy}px) rotate(${angleDeg}deg)`;
    }
  }));

  return (
    <g>
      {/* Orbit path */}
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#374151" strokeWidth="2" strokeDasharray="6,6" />
      
      {/* Center mass (pivot) */}
      <circle cx={cx} cy={cy} r="6" fill="#f59e0b" />
      <text x={cx} y={cy + 20} fill="#f59e0b" fontSize="10" textAnchor="middle">Pivot</text>
      
      {/* Rotating Group */}
      <g ref={groupRef} style={{ transform: `translate(${cx}px, ${cy}px) rotate(0deg)` }}>
        {/* Radius line */}
        <line x1={0} y1={0} x2={radius} y2={0} stroke="#6b7280" strokeWidth="1" strokeDasharray="3,3" />

        {/* Particle */}
        <Particle particle={{ mass: state.mass || 1, velocity: state.velocity || 0, position: 0 }} x={radius} y={0} color="#8b5cf6" glowColor="rgba(139, 92, 246, 0.4)" />

        {/* Tangential Velocity Vector */}
        <ForceVector 
          x={radius} 
          y={0} 
          magnitude={state.velocity || 0} 
          direction={90} 
          color="#10b981" 
          scale={3} 
          label={`v`} 
        />

        {/* Centripetal Force Vector (points to center) */}
        <ForceVector 
          x={radius} 
          y={0} 
          magnitude={state.force || 0} 
          direction={180} 
          color="#ef4444" 
          scale={2} 
          label={`Fc`} 
        />
      </g>
    </g>
  );
});
