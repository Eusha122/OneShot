import React from "react";
import type { PhysicsLabParams } from "../../sscPhysicsEngine";

export function EchoSimulation({
  params,
  progress,
  velocity,
}: {
  params: PhysicsLabParams;
  progress: number;
  velocity: number;
}) {
  // distance = params.distance
  // t = 2d / v
  const roundTripTime = (2 * params.distance) / velocity;
  
  // Wrap progress to handle the looping 0→1 cycle from WaveScene
  const wrappedProgress = progress - Math.floor(progress);
  // We'll map wrappedProgress (0 to 1) to represent 0 to roundTripTime + some padding
  const totalSimTime = roundTripTime * 1.2;
  const currentTime = wrappedProgress * totalSimTime;

  // X coordinate mapping
  const sourceX = 60;
  const wallX = 580;
  const pixelsPerMeter = (wallX - sourceX) / params.distance;

  // Wave position
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

  return (
    <g>
      {/* Wall */}
      <rect x={wallX} y="40" width="20" height="200" rx="4" fill="#2a2f38" stroke="rgba(255,255,255,0.2)" />
      
      {/* Source (Person/Speaker) */}
      <circle cx={sourceX} cy="140" r="16" fill="#f5f5f5" />
      <text x={sourceX} y="170" textAnchor="middle" className="fill-[#9ca3af] text-[10px]">Source</text>

      {/* The propagating sound wave pulse */}
      {currentDistance <= 2 * params.distance && (
        <g>
          <circle 
            cx={waveX} 
            cy="140" 
            r="30" 
            fill="none" 
            stroke={isReturning ? "#10b981" : "#ff3b30"} 
            strokeWidth="3" 
            opacity="0.9" 
          />
          <circle 
            cx={waveX} 
            cy="140" 
            r="45" 
            fill="none" 
            stroke={isReturning ? "rgba(16,185,129,0.3)" : "rgba(255,59,48,0.3)"} 
            strokeWidth="2" 
          />
        </g>
      )}

      {/* Distance markers */}
      <line x1={sourceX} y1="230" x2={wallX} y2="230" stroke="#60a5fa" strokeWidth="2" />
      <line x1={sourceX} y1="225" x2={sourceX} y2="235" stroke="#60a5fa" strokeWidth="2" />
      <line x1={wallX} y1="225" x2={wallX} y2="235" stroke="#60a5fa" strokeWidth="2" />
      <text x={(sourceX + wallX) / 2} y="248" textAnchor="middle" className="fill-[#9ca3af] text-[11px]">
        d = {params.distance.toFixed(1)} m
      </text>
      
      {/* Time overlay */}
      <text x="60" y="30" className="fill-[#e5e7eb] text-[12px] font-mono">
        t = {currentTime.toFixed(2)}s / {roundTripTime.toFixed(2)}s (echo delay)
      </text>
    </g>
  );
}
