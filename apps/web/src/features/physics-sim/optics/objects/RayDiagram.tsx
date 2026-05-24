import React from "react";
import type { PhysicsLabParams } from "../../sscPhysicsEngine";

export function RayDiagram({
  params,
  v,
  magnification,
}: {
  params: PhysicsLabParams;
  v: number;
  magnification: number;
}) {
  const u = params.lensDistance;
  const f = params.focalLength;
  const ho = 40; // Fixed object height for visualization
  const hi = ho * magnification;

  // Center coordinates
  const cx = 320;
  const cy = 140;
  
  // Scale distances (e.g., 10 meters = 100 pixels)
  const scale = 10;
  
  // Object position
  const ox = cx - u * scale;
  const oy = cy - ho;

  // Image position (v is positive -> real image on the right side for a lens, or left side for a mirror.
  // Wait, SSC mirror formula 1/v + 1/u = 1/f typically means real images are on the same side for mirrors.
  // We'll treat this as a mirror diagram where positive v means real image on the left.
  const isReal = v > 0 && v !== Infinity;
  const ix = isReal ? cx - v * scale : cx + Math.abs(v) * scale;
  const iy = cy - hi;

  const fPos = cx - f * scale; // Focal point
  const cPos = cx - 2 * f * scale; // Center of curvature (R = 2f)

  return (
    <g>
      {/* Principal Axis */}
      <line x1="20" y1={cy} x2="620" y2={cy} stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeDasharray="4 4" />
      
      {/* Mirror/Lens representation (Concave Mirror arc) */}
      <path 
        d={`M ${cx + 20} ${cy - 80} Q ${cx - 20} ${cy} ${cx + 20} ${cy + 80}`} 
        fill="none" 
        stroke="#9ca3af" 
        strokeWidth="4" 
      />
      <line x1={cx} y1={cy - 90} x2={cx} y2={cy + 90} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

      {/* Points F and C */}
      <circle cx={fPos} cy={cy} r="4" fill="#f5f5f5" />
      <text x={fPos} y={cy + 20} textAnchor="middle" className="fill-[#f5f5f5] text-[12px]">F</text>
      
      <circle cx={cPos} cy={cy} r="4" fill="#f5f5f5" />
      <text x={cPos} y={cy + 20} textAnchor="middle" className="fill-[#f5f5f5] text-[12px]">C</text>

      {/* Object (Arrow) */}
      <line x1={ox} y1={cy} x2={ox} y2={oy} stroke="#60a5fa" strokeWidth="4" />
      <path d={`M ${ox} ${oy} L ${ox - 5} ${oy + 5} L ${ox + 5} ${oy + 5} Z`} fill="#60a5fa" />
      <text x={ox} y={oy - 10} textAnchor="middle" className="fill-[#60a5fa] text-[12px]">Object</text>

      {/* Image (Arrow) */}
      {v !== Infinity && (
        <>
          <line 
            x1={ix} y1={cy} x2={ix} y2={iy} 
            stroke="#ff3b30" 
            strokeWidth="4" 
            strokeDasharray={!isReal ? "4 2" : "none"}
          />
          {hi > 0 ? (
            <path d={`M ${ix} ${iy} L ${ix - 5} ${iy + 5} L ${ix + 5} ${iy + 5} Z`} fill="#ff3b30" />
          ) : (
            <path d={`M ${ix} ${iy} L ${ix - 5} ${iy - 5} L ${ix + 5} ${iy - 5} Z`} fill="#ff3b30" />
          )}
          <text x={ix} y={hi > 0 ? iy - 10 : iy + 20} textAnchor="middle" className="fill-[#ff3b30] text-[12px]">
            {isReal ? "Real Image" : "Virtual Image"}
          </text>
        </>
      )}

      {/* Ray Tracing Lines */}
      {/* Ray 1: Parallel to principal axis -> passes through focal point */}
      <line x1={ox} y1={oy} x2={cx} y2={oy} stroke="#fcd34d" strokeWidth="2" strokeDasharray="4 2" />
      <line x1={cx} y1={oy} x2={isReal ? ix : ix} y2={isReal ? iy : iy} stroke="#fcd34d" strokeWidth="2" opacity="0.6" />
      
      {/* Ray 2: Passes through pole -> reflects symmetrically */}
      <line x1={ox} y1={oy} x2={cx} y2={cy} stroke="#34d399" strokeWidth="2" strokeDasharray="4 2" />
      <line x1={cx} y1={cy} x2={isReal ? ix : ix} y2={isReal ? iy : iy} stroke="#34d399" strokeWidth="2" opacity="0.6" />
    </g>
  );
}
