import React, { forwardRef, useImperativeHandle, useRef } from "react";
import type { PhysicsLabParams } from "../../sscPhysicsEngine";

interface EchoSimulationProps {
  params: PhysicsLabParams;
  velocity: number;
}

export interface EchoSimulationRef {
  updateTimeFrac: (timeFrac: number) => void;
}

export const EchoSimulation = forwardRef<EchoSimulationRef, EchoSimulationProps>(({
  params,
  velocity,
}, ref) => {
  const waveGroupRef = useRef<SVGGElement>(null);
  const innerCircleRef = useRef<SVGCircleElement>(null);
  const outerCircleRef = useRef<SVGCircleElement>(null);
  const timeTextRef = useRef<SVGTextElement>(null);

  const roundTripTime = (2 * params.distance) / velocity;
  const totalSimTime = roundTripTime * 1.2;

  const sourceX = 60;
  const wallX = 580;
  const pixelsPerMeter = (wallX - sourceX) / params.distance;

  useImperativeHandle(ref, () => ({
    updateTimeFrac: (timeFrac: number) => {
      // timeFrac from Engine can loop if we want, or WaveScene might handle the looping.
      // Assuming timeFrac goes 0 -> 1 over `totalSimTime`.
      // Actually WaveScene feeds `progress` (0->1 looping).
      // If we use usePhysicsEngine, it gives timeFrac. Let's map it.
      
      // We'll scale timeFrac by frequency like WaveScene did.
      const speedFactor = params.frequency * 0.2;
      const adjustedProgress = (timeFrac * speedFactor) % 1;
      
      const currentTime = adjustedProgress * totalSimTime;
      const currentDistance = velocity * currentTime;
      
      let waveX = sourceX;
      let isReturning = false;

      if (currentDistance <= params.distance) {
        waveX = sourceX + currentDistance * pixelsPerMeter;
      } else if (currentDistance <= 2 * params.distance) {
        isReturning = true;
        waveX = wallX - (currentDistance - params.distance) * pixelsPerMeter;
      } else {
        waveX = sourceX; // Returned
      }

      if (waveGroupRef.current) {
        if (currentDistance <= 2 * params.distance) {
          waveGroupRef.current.style.display = "";
          waveGroupRef.current.style.transform = `translate3d(${waveX}px, 0px, 0)`;
          
          if (innerCircleRef.current) innerCircleRef.current.setAttribute("stroke", isReturning ? "#10b981" : "#ff3b30");
          if (outerCircleRef.current) outerCircleRef.current.setAttribute("stroke", isReturning ? "rgba(16,185,129,0.3)" : "rgba(255,59,48,0.3)");
        } else {
          waveGroupRef.current.style.display = "none";
        }
      }

      if (timeTextRef.current) {
        timeTextRef.current.textContent = `t = ${currentTime.toFixed(2)}s / ${roundTripTime.toFixed(2)}s (echo delay)`;
      }
    }
  }));

  return (
    <g>
      {/* Wall */}
      <rect x={wallX} y="40" width="20" height="200" rx="4" fill="#2a2f38" stroke="rgba(255,255,255,0.2)" />
      
      {/* Source (Person/Speaker) */}
      <circle cx={sourceX} cy="140" r="16" fill="#f5f5f5" />
      <text x={sourceX} y="170" textAnchor="middle" className="fill-[#9ca3af] text-[10px]">Source</text>

      {/* The propagating sound wave pulse */}
      <g ref={waveGroupRef} style={{ display: "none", transform: `translate3d(${sourceX}px, 0px, 0)` }}>
        <circle 
          ref={innerCircleRef}
          cx="0" 
          cy="140" 
          r="30" 
          fill="none" 
          stroke="#ff3b30" 
          strokeWidth="3" 
          opacity="0.9" 
        />
        <circle 
          ref={outerCircleRef}
          cx="0" 
          cy="140" 
          r="45" 
          fill="none" 
          stroke="rgba(255,59,48,0.3)" 
          strokeWidth="2" 
        />
      </g>

      {/* Distance markers */}
      <line x1={sourceX} y1="230" x2={wallX} y2="230" stroke="#60a5fa" strokeWidth="2" />
      <line x1={sourceX} y1="225" x2={sourceX} y2="235" stroke="#60a5fa" strokeWidth="2" />
      <line x1={wallX} y1="225" x2={wallX} y2="235" stroke="#60a5fa" strokeWidth="2" />
      <text x={(sourceX + wallX) / 2} y="248" textAnchor="middle" className="fill-[#9ca3af] text-[11px]">
        d = {params.distance.toFixed(1)} m
      </text>
      
      {/* Time overlay */}
      <text ref={timeTextRef} x="60" y="30" className="fill-[#e5e7eb] text-[12px] font-mono">
        t = 0.00s / {roundTripTime.toFixed(2)}s (echo delay)
      </text>
    </g>
  );
});
