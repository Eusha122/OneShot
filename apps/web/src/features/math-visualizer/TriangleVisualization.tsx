import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, RotateCcw } from "lucide-react";

export interface TriangleParams {
  A?: number; // Angle A
  B?: number; // Angle B
  C?: number; // Angle C
}

export function TriangleVisualization({
  initialParams,
  phase,
}: {
  initialParams: TriangleParams;
  phase: "entering" | "revealed" | "interactive";
}) {
  // Ensure angles add up to 180. If missing, distribute remainder.
  let { A = 60, B = 60, C = 60 } = initialParams;
  const sum = A + B + C;
  if (Math.abs(sum - 180) > 0.1) {
    if (initialParams.A && initialParams.B) C = 180 - A - B;
    else if (initialParams.B && initialParams.C) A = 180 - B - C;
    else if (initialParams.A && initialParams.C) B = 180 - A - C;
    else {
      A = 60; B = 60; C = 60;
    }
  }
  
  // Constrain angles to be valid (no degenerate triangles for visualizer)
  if (A <= 0) A = 1;
  if (B <= 0) B = 1;
  if (C <= 0) C = 1;

  const [angles, setAngles] = useState({ A, B, C });
  const svgRef = useRef<SVGSVGElement>(null);

  // Compute vertices
  // Base length 200, placed from (50, 250) to (250, 250)
  // Let vertex 1 (Angle A) be (50, 250)
  // Let vertex 2 (Angle B) be (250, 250)
  // Compute vertex 3 (Angle C) coordinates
  const sideC = 200; // Base side between A and B
  
  const radA = (angles.A * Math.PI) / 180;
  const radB = (angles.B * Math.PI) / 180;
  const radC = (angles.C * Math.PI) / 180;

  // Law of sines: sideA / sinA = sideB / sinB = sideC / sinC
  const sideB = (sideC * Math.sin(radB)) / Math.sin(radC);
  const sideA = (sideC * Math.sin(radA)) / Math.sin(radC);

  // Vertex coordinates
  const vA = { x: 50, y: 250 };
  const vB = { x: 50 + sideC, y: 250 };
  const vC = {
    x: vA.x + sideB * Math.cos(radA),
    y: vA.y - sideB * Math.sin(radA),
  };
  
  // Calculate a reasonable bounding box to center the SVG
  const minX = Math.min(vA.x, vB.x, vC.x) - 20;
  const maxX = Math.max(vA.x, vB.x, vC.x) + 20;
  const minY = Math.min(vA.y, vB.y, vC.y) - 20;
  const maxY = Math.max(vA.y, vB.y, vC.y) + 20;
  const width = Math.max(maxX - minX, 300);
  const height = Math.max(maxY - minY, 300);
  
  const vBox = `${minX} ${minY} ${width} ${height}`;

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 rounded-xl overflow-hidden border border-slate-700/50 shadow-inner">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-slate-700/50 z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          <h3 className="text-sm font-semibold text-slate-200 tracking-wide font-sans">
            Interactive Geometry
          </h3>
        </div>
      </div>
      
      {/* Formula overlay */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="absolute top-12 right-4 bg-slate-800/80 backdrop-blur-md px-4 py-2 rounded-lg border border-slate-700 font-mono text-sm shadow-xl"
      >
        <span className="text-pink-400">∠A</span> + <span className="text-cyan-400">∠B</span> + <span className="text-emerald-400">∠C</span> = 180°
        <div className="text-xs text-slate-400 mt-1">
          {angles.A.toFixed(1)}° + {angles.B.toFixed(1)}° + {angles.C.toFixed(1)}° = 180°
        </div>
      </motion.div>

      {/* Canvas */}
      <div className="flex-1 relative bg-slate-900 overflow-hidden">
        {/* Background grid */}
        <div 
          className="absolute inset-0 opacity-10" 
          style={{ 
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', 
            backgroundSize: '20px 20px' 
          }} 
        />
        
        <svg 
          ref={svgRef}
          className="w-full h-full"
          viewBox={vBox}
          preserveAspectRatio="xMidYMid meet"
        >
          <motion.polygon
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{ opacity: 1, pathLength: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            points={`${vA.x},${vA.y} ${vB.x},${vB.y} ${vC.x},${vC.y}`}
            fill="rgba(34, 211, 238, 0.05)"
            stroke="rgba(34, 211, 238, 0.8)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          
          {/* Angles Arcs */}
          {/* Very basic circles as points for now */}
          <circle cx={vA.x} cy={vA.y} r="5" fill="#f472b6" />
          <circle cx={vB.x} cy={vB.y} r="5" fill="#22d3ee" />
          <circle cx={vC.x} cy={vC.y} r="5" fill="#34d399" />
          
          {/* Labels */}
          <text x={vA.x - 15} y={vA.y + 15} fill="#f472b6" fontSize="14" fontWeight="bold">A</text>
          <text x={vB.x + 10} y={vB.y + 15} fill="#22d3ee" fontSize="14" fontWeight="bold">B</text>
          <text x={vC.x} y={vC.y - 15} fill="#34d399" fontSize="14" fontWeight="bold" textAnchor="middle">C</text>
        </svg>
      </div>

      {/* Controls */}
      {phase === "interactive" && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-slate-800/80 border-t border-slate-700/50 flex flex-col gap-3 z-10"
        >
          <div className="flex gap-4 items-center text-sm text-slate-300">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-pink-400 font-mono text-xs font-semibold">Angle A: {angles.A.toFixed(1)}°</label>
              <input 
                type="range" min="1" max="178" step="1" 
                value={angles.A} 
                onChange={(e) => {
                  const newA = parseFloat(e.target.value);
                  const rem = 180 - newA;
                  setAngles(prev => ({
                    A: newA,
                    B: rem * (prev.B / (prev.B + prev.C)),
                    C: rem * (prev.C / (prev.B + prev.C)),
                  }));
                }}
                className="accent-pink-400"
              />
            </div>
            
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-cyan-400 font-mono text-xs font-semibold">Angle B: {angles.B.toFixed(1)}°</label>
              <input 
                type="range" min="1" max="178" step="1" 
                value={angles.B} 
                onChange={(e) => {
                  const newB = parseFloat(e.target.value);
                  const rem = 180 - newB;
                  setAngles(prev => ({
                    A: rem * (prev.A / (prev.A + prev.C)),
                    B: newB,
                    C: rem * (prev.C / (prev.A + prev.C)),
                  }));
                }}
                className="accent-cyan-400"
              />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
