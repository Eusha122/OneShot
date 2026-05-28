import React, { forwardRef, useImperativeHandle, useRef } from "react";
import type { PhysicsLabParams } from "../../sscPhysicsEngine";

// Simplified toPath to avoid regenerating the string from scratch if we don't have to,
// but for SineWave the path fundamentally changes shape on every frame, so we have to rebuild the d string.
function buildSinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x},${points[i].y}`;
  }
  return d;
}

interface SineWaveProps {
  params: PhysicsLabParams;
}

export interface SineWaveRef {
  updateTimeFrac: (timeFrac: number) => void;
}

export const SineWave = forwardRef<SineWaveRef, SineWaveProps>(({ params }, ref) => {
  const pathRef = useRef<SVGPathElement>(null);
  
  // We don't know exactly how many particles we need until render,
  // but it's bounded. Let's pre-allocate 50 max.
  const MAX_PARTICLES = 50;
  const particleRefs = useRef<(SVGCircleElement | null)[]>([]);
  
  // Refs for the wavelength bracket
  const bracketLineRef = useRef<SVGLineElement>(null);
  const bracketTick1Ref = useRef<SVGLineElement>(null);
  const bracketTick2Ref = useRef<SVGLineElement>(null);
  const bracketTextRef = useRef<SVGTextElement>(null);

  const numPoints = 200;
  const visualWavelength = Math.max(0.5, params.wavelength) * 50; 
  const cycles = 600 / visualWavelength;
  const numParticles = Math.min(MAX_PARTICLES, Math.ceil(cycles) + 1);

  useImperativeHandle(ref, () => ({
    updateTimeFrac: (timeFrac: number) => {
      if (!pathRef.current) return;
      
      const speedFactor = params.frequency * 0.2; 
      const adjustedProgress = (timeFrac * speedFactor) % 1;
      const phaseShift = adjustedProgress * Math.PI * 2;

      // Update Path
      const points = new Array(numPoints);
      for (let i = 0; i < numPoints; i++) {
        const x = 20 + (i / (numPoints - 1)) * 600;
        const normalizedX = i / (numPoints - 1);
        const y = 140 + Math.sin(normalizedX * Math.PI * 2 * cycles - phaseShift) * params.amplitude * 40;
        points[i] = { x, y };
      }
      pathRef.current.setAttribute("d", buildSinePath(points));

      // Update Particles
      const particlePoints = new Array(numParticles);
      for (let i = 0; i < numParticles; i++) {
        const normalizedX = i / cycles;
        const x = 20 + normalizedX * 600;
        const y = 140 + Math.sin(normalizedX * Math.PI * 2 * cycles - phaseShift) * params.amplitude * 40;
        particlePoints[i] = { x, y };
        
        const circle = particleRefs.current[i];
        if (circle) {
          circle.setAttribute("cx", String(x));
          circle.setAttribute("cy", String(y));
          circle.style.display = "";
        }
      }
      
      // Hide unused particles
      for (let i = numParticles; i < MAX_PARTICLES; i++) {
        const circle = particleRefs.current[i];
        if (circle) circle.style.display = "none";
      }

      // Update Wavelength bracket
      if (numParticles > 1 && bracketLineRef.current && bracketTick1Ref.current && bracketTick2Ref.current && bracketTextRef.current) {
        const p1 = particlePoints[0];
        const p2 = particlePoints[1];
        
        bracketLineRef.current.setAttribute("x1", String(p1.x));
        bracketLineRef.current.setAttribute("x2", String(p2.x));
        
        bracketTick1Ref.current.setAttribute("x1", String(p1.x));
        bracketTick1Ref.current.setAttribute("x2", String(p1.x));
        
        bracketTick2Ref.current.setAttribute("x1", String(p2.x));
        bracketTick2Ref.current.setAttribute("x2", String(p2.x));
        
        const midX = (p1.x + p2.x) / 2;
        bracketTextRef.current.setAttribute("x", String(midX));
        
        bracketLineRef.current.style.display = "";
        bracketTick1Ref.current.style.display = "";
        bracketTick2Ref.current.style.display = "";
        bracketTextRef.current.style.display = "";
      } else if (bracketLineRef.current) {
        bracketLineRef.current.style.display = "none";
        if (bracketTick1Ref.current) bracketTick1Ref.current.style.display = "none";
        if (bracketTick2Ref.current) bracketTick2Ref.current.style.display = "none";
        if (bracketTextRef.current) bracketTextRef.current.style.display = "none";
      }
    }
  }));

  // Initial dummy particles
  const initialParticles = [];
  for (let i = 0; i < MAX_PARTICLES; i++) {
    initialParticles.push(
      <circle 
        key={i} 
        ref={(el) => { particleRefs.current[i] = el; }}
        cx="-100" cy="-100" 
        r="4.5" fill="#f5f5f5" opacity="0.92" 
        style={{ display: "none" }}
      />
    );
  }

  return (
    <g>
      <line x1="20" x2="620" y1="140" y2="140" stroke="rgba(255,255,255,0.18)" strokeDasharray="5 7" />
      <path ref={pathRef} fill="none" stroke="#60a5fa" strokeLinecap="round" strokeWidth="3" />
      
      {initialParticles}
      
      {/* Wavelength bracket indicator */}
      <line ref={bracketLineRef} y1="240" y2="240" stroke="#10b981" strokeWidth="2" style={{ display: "none" }} />
      <line ref={bracketTick1Ref} y1="235" y2="245" stroke="#10b981" strokeWidth="2" style={{ display: "none" }} />
      <line ref={bracketTick2Ref} y1="235" y2="245" stroke="#10b981" strokeWidth="2" style={{ display: "none" }} />
      <text
        ref={bracketTextRef}
        y="260"
        textAnchor="middle"
        className="fill-[#10b981] text-[11px]"
        style={{ display: "none" }}
      >
        λ = {params.wavelength.toFixed(1)} m
      </text>
    </g>
  );
});
