import React from "react";
import type { PhysicsLabParams } from "../../sscPhysicsEngine";

export function RefractionBoundary({
  params,
  angleOfRefractionDeg,
  isTotalInternalReflection,
}: {
  params: PhysicsLabParams;
  angleOfRefractionDeg: number;
  isTotalInternalReflection: boolean;
}) {
  const cx = 320;
  const cy = 140;
  const rayLength = 120;

  // Incident ray (coming from top left)
  const angleI_Rad = (params.angleDegrees * Math.PI) / 180;
  // Starting point of incident ray
  const ix = cx - Math.sin(angleI_Rad) * rayLength;
  const iy = cy - Math.cos(angleI_Rad) * rayLength;

  // Refracted ray
  const angleR_Rad = (angleOfRefractionDeg * Math.PI) / 180;
  let rx = 0;
  let ry = 0;

  if (isTotalInternalReflection) {
    // Reflection back into medium 1
    rx = cx + Math.sin(angleR_Rad) * rayLength;
    ry = cy - Math.cos(angleR_Rad) * rayLength; // goes up
  } else {
    // Refraction into medium 2
    rx = cx + Math.sin(angleR_Rad) * rayLength;
    ry = cy + Math.cos(angleR_Rad) * rayLength; // goes down
  }

  // Reflected ray (always present)
  const reflectX = cx + Math.sin(angleI_Rad) * rayLength;
  const reflectY = cy - Math.cos(angleI_Rad) * rayLength;

  return (
    <g>
      {/* Backgrounds for mediums */}
      <rect x="0" y="0" width="640" height="140" fill="rgba(255, 255, 255, 0.05)" />
      <rect x="0" y="140" width="640" height="140" fill="rgba(96, 165, 250, 0.15)" />

      {/* Boundary line */}
      <line x1="0" y1={cy} x2="640" y2={cy} stroke="#60a5fa" strokeWidth="2" />

      {/* Normal line */}
      <line x1={cx} y1={cy - 120} x2={cx} y2={cy + 120} stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="5 5" />

      {/* Incident Ray */}
      <line x1={ix} y1={iy} x2={cx} y2={cy} stroke="#fcd34d" strokeWidth="3" />
      <path d={`M ${ix} ${iy} L ${ix + 6} ${iy + 12} L ${ix - 6} ${iy + 8} Z`} fill="#fcd34d" />
      
      {/* Refracted / TIR Ray */}
      <line x1={cx} y1={cy} x2={rx} y2={ry} stroke={isTotalInternalReflection ? "#ff3b30" : "#34d399"} strokeWidth="3" />
      <path d={`M ${rx} ${ry} L ${rx - 6} ${ry - 12} L ${rx + 6} ${ry - 8} Z`} fill={isTotalInternalReflection ? "#ff3b30" : "#34d399"} />

      {/* Partial Reflected Ray (only if not TIR, just to show it exists) */}
      {!isTotalInternalReflection && (
        <line x1={cx} y1={cy} x2={reflectX} y2={reflectY} stroke="#fcd34d" strokeWidth="1" opacity="0.4" strokeDasharray="3 3" />
      )}

      {/* Labels */}
      <text x="20" y="30" className="fill-white text-[12px] font-bold">Medium 1 (n₁ = {params.refractiveIndex.toFixed(2)})</text>
      <text x="20" y="260" className="fill-[#60a5fa] text-[12px] font-bold">Medium 2 (n₂ = {params.refractiveIndex2.toFixed(2)})</text>
      
      <text x={cx - 40} y={cy - 40} className="fill-[#fcd34d] text-[12px]">i = {params.angleDegrees.toFixed(1)}°</text>
      <text x={cx + 40} y={isTotalInternalReflection ? cy - 40 : cy + 40} className={isTotalInternalReflection ? "fill-[#ff3b30] text-[12px]" : "fill-[#34d399] text-[12px]"}>
        r = {angleOfRefractionDeg.toFixed(1)}°
      </text>

      {isTotalInternalReflection && (
        <text x={cx} y={cy + 80} textAnchor="middle" className="fill-[#ff3b30] font-bold text-[14px]">
          TOTAL INTERNAL REFLECTION
        </text>
      )}
    </g>
  );
}
