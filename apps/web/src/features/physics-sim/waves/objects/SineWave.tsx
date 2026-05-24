import React from "react";
import { toPath } from "../../shared/utils/toPath";
import type { PhysicsLabParams } from "../../sscPhysicsEngine";

export function SineWave({
  params,
  progress,
}: {
  params: PhysicsLabParams;
  progress: number;
}) {
  const phaseShift = progress * Math.PI * 2;
  const numPoints = 200;
  
  // Wavelength in coordinate space (scales visually based on formula value)
  const visualWavelength = Math.max(0.5, params.wavelength) * 50; 
  const cycles = 600 / visualWavelength;

  const points = Array.from({ length: numPoints }, (_, index) => {
    const x = 20 + (index / (numPoints - 1)) * 600;
    const normalizedX = index / (numPoints - 1);
    
    // Wave equation: y = A * sin(kx - wt)
    // Here we use simple progressive shift: wt is represented by phaseShift
    // kx is represented by normalizedX * 2pi * cycles
    const y = 140 + Math.sin(normalizedX * Math.PI * 2 * cycles - phaseShift) * params.amplitude * 40;
    return { x, y };
  });

  const path = toPath(points);

  // Particles that ride the wave to show transverse motion
  const particlePoints = Array.from({ length: Math.ceil(cycles) + 1 }, (_, index) => {
    const normalizedX = index / cycles;
    const x = 20 + normalizedX * 600;
    const y = 140 + Math.sin(normalizedX * Math.PI * 2 * cycles - phaseShift) * params.amplitude * 40;
    return { x, y };
  });

  return (
    <g>
      <line x1="20" x2="620" y1="140" y2="140" stroke="rgba(255,255,255,0.18)" strokeDasharray="5 7" />
      <path d={path} fill="none" stroke="#60a5fa" strokeLinecap="round" strokeWidth="3" />
      
      {particlePoints.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r="4.5" fill="#f5f5f5" opacity="0.92" />
      ))}
      
      {/* Wavelength bracket indicator (from first particle to second) */}
      {particlePoints.length > 1 && (
        <>
          <line
            x1={particlePoints[0].x}
            x2={particlePoints[1].x}
            y1={240}
            y2={240}
            stroke="#10b981"
            strokeWidth="2"
          />
          <line x1={particlePoints[0].x} x2={particlePoints[0].x} y1={235} y2={245} stroke="#10b981" strokeWidth="2" />
          <line x1={particlePoints[1].x} x2={particlePoints[1].x} y1={235} y2={245} stroke="#10b981" strokeWidth="2" />
          <text
            x={(particlePoints[0].x + particlePoints[1].x) / 2}
            y={260}
            textAnchor="middle"
            className="fill-[#10b981] text-[11px]"
          >
            λ = {params.wavelength.toFixed(1)} m
          </text>
        </>
      )}
    </g>
  );
}
