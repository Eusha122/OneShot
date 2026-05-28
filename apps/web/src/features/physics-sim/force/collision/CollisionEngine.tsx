import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { Particle } from "../objects/Particle";
import { ForceVector } from "../objects/ForceVector";
import { CollisionState } from "./CollisionState";
import { getParticlePositionsAtTime } from "./collisionHelpers";

interface CollisionEngineProps {
  state: CollisionState;
}

export interface CollisionEngineRef {
  updateTimeFrac: (timeFrac: number) => void;
}

export const CollisionEngine = forwardRef<CollisionEngineRef, CollisionEngineProps>(({ state }, ref) => {
  const cy = 110;
  const centerX = 320; // Collision point
  
  const p1GroupRef = useRef<SVGGElement>(null);
  const p2GroupRef = useRef<SVGGElement>(null);
  const flashRef = useRef<SVGCircleElement>(null);
  
  const p1BeforeRef = useRef<SVGGElement>(null);
  const p1AfterRef = useRef<SVGGElement>(null);
  const p2BeforeRef = useRef<SVGGElement>(null);
  const p2AfterRef = useRef<SVGGElement>(null);

  useImperativeHandle(ref, () => ({
    updateTimeFrac: (timeFrac: number) => {
      const { x1, x2, isPostCollision } = getParticlePositionsAtTime(state, timeFrac, centerX);
      
      if (p1GroupRef.current) p1GroupRef.current.style.transform = `translate3d(${x1}px, ${cy}px, 0)`;
      if (p2GroupRef.current) p2GroupRef.current.style.transform = `translate3d(${x2}px, ${cy}px, 0)`;
      
      // Toggle visibility
      if (p1BeforeRef.current) p1BeforeRef.current.style.display = isPostCollision ? 'none' : 'block';
      if (p1AfterRef.current) p1AfterRef.current.style.display = isPostCollision ? 'block' : 'none';
      
      if (p2BeforeRef.current) p2BeforeRef.current.style.display = isPostCollision ? 'none' : 'block';
      if (p2AfterRef.current) p2AfterRef.current.style.display = isPostCollision ? 'block' : 'none';
      
      // Flash
      if (flashRef.current) {
        if (Math.abs(timeFrac - state.collisionTime) < 0.1) {
          flashRef.current.style.opacity = "0.6";
        } else {
          flashRef.current.style.opacity = "0";
        }
      }
    }
  }));

  // Initial setup: get positions at time=0
  const { x1, x2 } = getParticlePositionsAtTime(state, 0, centerX);
  const u1 = state.particleA.position;
  const u2 = state.particleB.position;
  const v1 = state.particleA.velocity;
  const v2 = state.particleB.velocity;

  return (
    <g>
      {/* Track */}
      <line x1="40" y1={cy + 30} x2="600" y2={cy + 30} stroke="#374151" strokeWidth="2" strokeDasharray="5,5" />
      
      {/* Particle 1 */}
      <g ref={p1GroupRef} style={{ transform: `translate3d(${x1}px, ${cy}px, 0)` }}>
        <Particle particle={{...state.particleA, position: 0}} x={0} y={0} color="#ec4899" glowColor="rgba(236, 72, 153, 0.4)" />
        
        <g ref={p1BeforeRef} style={{ display: 'block' }}>
          {Math.abs(u1) > 0.1 && (
            <ForceVector 
              x={(u1 > 0 ? 25 : -25)} 
              y={0} 
              magnitude={u1} 
              direction={u1 > 0 ? "right" : "left"} 
              color="#ec4899" 
              scale={3} 
              label={`v = ${Math.abs(u1).toFixed(1)}`} 
            />
          )}
        </g>
        <g ref={p1AfterRef} style={{ display: 'none' }}>
          {Math.abs(v1) > 0.1 && (
            <ForceVector 
              x={(v1 > 0 ? 25 : -25)} 
              y={0} 
              magnitude={v1} 
              direction={v1 > 0 ? "right" : "left"} 
              color="#ec4899" 
              scale={3} 
              label={`v = ${Math.abs(v1).toFixed(1)}`} 
            />
          )}
        </g>
      </g>

      {/* Particle 2 */}
      <g ref={p2GroupRef} style={{ transform: `translate3d(${x2}px, ${cy}px, 0)` }}>
        <Particle particle={{...state.particleB, position: 0}} x={0} y={0} color="#06b6d4" glowColor="rgba(6, 182, 212, 0.4)" />
        
        <g ref={p2BeforeRef} style={{ display: 'block' }}>
          {Math.abs(u2) > 0.1 && (
            <ForceVector 
              x={(u2 > 0 ? 25 : -25)} 
              y={0} 
              magnitude={u2} 
              direction={u2 > 0 ? "right" : "left"} 
              color="#06b6d4" 
              scale={3} 
              label={`v = ${Math.abs(u2).toFixed(1)}`} 
            />
          )}
        </g>
        <g ref={p2AfterRef} style={{ display: 'none' }}>
          {Math.abs(v2) > 0.1 && (
            <ForceVector 
              x={(v2 > 0 ? 25 : -25)} 
              y={0} 
              magnitude={v2} 
              direction={v2 > 0 ? "right" : "left"} 
              color="#06b6d4" 
              scale={3} 
              label={`v = ${Math.abs(v2).toFixed(1)}`} 
            />
          )}
        </g>
      </g>
      
      {/* Collision Flash */}
      <circle ref={flashRef} cx={centerX} cy={cy} r="40" fill="#facc15" opacity="0" style={{ filter: "blur(10px)", transition: "opacity 0.1s" }} />
    </g>
  );
});
