import React from "react";
import type { PhysicsLabParams } from "../../sscPhysicsEngine";

export function FieldLines({
  params,
  force,
  eField,
}: {
  params: PhysicsLabParams;
  force: number;
  eField: number;
}) {
  const cx = 320;
  const cy = 140;
  
  // Two charges
  const q1 = params.charge;
  const q2 = 1.6e-19; // reference charge
  
  // Distance scaling (assuming distance is in meters, let's map 1m to 100px)
  const pxDistance = params.distance * 100;
  const x1 = cx - pxDistance / 2;
  const x2 = cx + pxDistance / 2;

  const isAttracting = (q1 > 0 && q2 < 0) || (q1 < 0 && q2 > 0);

  // Simple field lines for Q1 (central radiating pattern)
  const numLines = 12;
  const lines = Array.from({ length: numLines }, (_, i) => {
    const angle = (i / numLines) * Math.PI * 2;
    const rStart = 20;
    const rEnd = 60;
    
    // Direction of field lines goes away from positive, towards negative
    const dir = q1 > 0 ? 1 : -1;
    
    return {
      x1: x1 + Math.cos(angle) * rStart,
      y1: cy + Math.sin(angle) * rStart,
      x2: x1 + Math.cos(angle) * rEnd * dir,
      y2: cy + Math.sin(angle) * rEnd * dir,
    };
  });

  return (
    <g>
      {/* Background Grid Lines to give space feel */}
      <circle cx={x1} cy={cy} r="100" fill="rgba(96,165,250,0.05)" />
      <circle cx={x2} cy={cy} r="100" fill="rgba(255,59,48,0.05)" />

      {/* Field lines around q1 */}
      {lines.map((line, i) => (
        <g key={i}>
          <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
          {/* Arrowhead */}
          <circle cx={line.x2} cy={line.y2} r="2" fill="rgba(255,255,255,0.5)" />
        </g>
      ))}

      {/* Distance Line */}
      <line x1={x1} y1={cy + 50} x2={x2} y2={cy + 50} stroke="#60a5fa" strokeDasharray="4 2" strokeWidth="2" />
      <line x1={x1} y1={cy + 45} x2={x1} y2={cy + 55} stroke="#60a5fa" strokeWidth="2" />
      <line x1={x2} y1={cy + 45} x2={x2} y2={cy + 55} stroke="#60a5fa" strokeWidth="2" />
      <text x={cx} y={cy + 70} textAnchor="middle" className="fill-[#60a5fa] text-[12px]">r = {params.distance.toFixed(2)} m</text>

      {/* Charge 1 */}
      <circle cx={x1} cy={cy} r="15" fill={q1 > 0 ? "#ff3b30" : "#0ea5e9"} />
      <text x={x1} y={cy + 4} textAnchor="middle" className="fill-white font-bold text-[12px]">{q1 > 0 ? "+" : "-"}</text>
      <text x={x1} y={cy - 25} textAnchor="middle" className="fill-white text-[12px]">q₁</text>

      {/* Charge 2 */}
      <circle cx={x2} cy={cy} r="15" fill={q2 > 0 ? "#ff3b30" : "#0ea5e9"} />
      <text x={x2} y={cy + 4} textAnchor="middle" className="fill-white font-bold text-[12px]">{q2 > 0 ? "+" : "-"}</text>
      <text x={x2} y={cy - 25} textAnchor="middle" className="fill-white text-[12px]">q₂</text>

      {/* Force Vectors */}
      {/* If attracting, arrows point to each other. If repelling, they point away */}
      <g stroke={isAttracting ? "#34d399" : "#fcd34d"} strokeWidth="3">
        {/* Force on q1 */}
        <line x1={x1} y1={cy} x2={x1 + (isAttracting ? 40 : -40)} y2={cy} />
        <path d={`M ${x1 + (isAttracting ? 40 : -40)} ${cy} L ${x1 + (isAttracting ? 30 : -30)} ${cy - 5} L ${x1 + (isAttracting ? 30 : -30)} ${cy + 5} Z`} fill={isAttracting ? "#34d399" : "#fcd34d"} stroke="none" />
        
        {/* Force on q2 */}
        <line x1={x2} y1={cy} x2={x2 + (isAttracting ? -40 : 40)} y2={cy} />
        <path d={`M ${x2 + (isAttracting ? -40 : 40)} ${cy} L ${x2 + (isAttracting ? -30 : 30)} ${cy - 5} L ${x2 + (isAttracting ? -30 : 30)} ${cy + 5} Z`} fill={isAttracting ? "#34d399" : "#fcd34d"} stroke="none" />
      </g>

      <text x={cx} y={20} textAnchor="middle" className="fill-white font-mono text-[14px]">
        F = {force.toExponential(2)} N
      </text>
      <text x={cx} y={40} textAnchor="middle" className="fill-gray-400 font-mono text-[12px]">
        E = {eField.toExponential(2)} N/C
      </text>
    </g>
  );
}
