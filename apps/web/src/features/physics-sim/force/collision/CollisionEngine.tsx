import React from "react";
import { Particle } from "../objects/Particle";
import { ForceVector } from "../objects/ForceVector";
import { CollisionState } from "./CollisionState";
import { getParticlePositionsAtTime } from "./collisionHelpers";

interface CollisionEngineProps {
  state: CollisionState;
  time: number; // 0 to 1
}

export function CollisionEngine({ state, time }: CollisionEngineProps) {
  const cy = 110;
  const centerX = 320; // Collision point
  
  const { x1, x2, vel1, vel2 } = getParticlePositionsAtTime(state, time, centerX);

  return (
    <g>
      {/* Track */}
      <line x1="40" y1={cy + 30} x2="600" y2={cy + 30} stroke="#374151" strokeWidth="2" strokeDasharray="5,5" />
      
      {/* Particle 1 */}
      <Particle particle={{...state.particleA, position: 0}} x={x1} y={cy} color="#ec4899" glowColor="rgba(236, 72, 153, 0.4)" />
      {/* Velocity Vector 1 */}
      {Math.abs(vel1) > 0.1 && (
        <ForceVector 
          x={x1 + (vel1 > 0 ? 25 : -25)} 
          y={cy} 
          magnitude={vel1} 
          direction={vel1 > 0 ? "right" : "left"} 
          color="#ec4899" 
          scale={3} 
          label={`v = ${Math.abs(vel1).toFixed(1)}`} 
        />
      )}

      {/* Particle 2 */}
      <Particle particle={{...state.particleB, position: 0}} x={x2} y={cy} color="#06b6d4" glowColor="rgba(6, 182, 212, 0.4)" />
      {/* Velocity Vector 2 */}
      {Math.abs(vel2) > 0.1 && (
        <ForceVector 
          x={x2 + (vel2 > 0 ? 25 : -25)} 
          y={cy} 
          magnitude={vel2} 
          direction={vel2 > 0 ? "right" : "left"} 
          color="#06b6d4" 
          scale={3} 
          label={`v = ${Math.abs(vel2).toFixed(1)}`} 
        />
      )}
      
      {/* Collision Flash */}
      {Math.abs(time - state.collisionTime) < 0.1 && (
        <circle cx={centerX} cy={cy} r="40" fill="#facc15" opacity="0.6" style={{ filter: "blur(10px)" }} />
      )}
    </g>
  );
}
