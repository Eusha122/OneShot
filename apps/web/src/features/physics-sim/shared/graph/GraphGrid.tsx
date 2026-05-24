import React from "react";

export function GraphGrid() {
  return (
    <g>
      <rect width="640" height="280" fill="#0d1117" />
      {Array.from({ length: 33 }, (_, index) => (
        <line key={`v-${index}`} x1={index * 20} x2={index * 20} y1="0" y2="280" stroke="rgba(255,255,255,0.045)" />
      ))}
      {Array.from({ length: 15 }, (_, index) => (
        <line key={`h-${index}`} x1="0" x2="640" y1={index * 20} y2={index * 20} stroke="rgba(255,255,255,0.045)" />
      ))}
      {Array.from({ length: 9 }, (_, index) => (
        <line key={`mv-${index}`} x1={index * 80} x2={index * 80} y1="0" y2="280" stroke="rgba(255,255,255,0.095)" />
      ))}
      {Array.from({ length: 4 }, (_, index) => (
        <line key={`mh-${index}`} x1="0" x2="640" y1={index * 80} y2={index * 80} stroke="rgba(255,255,255,0.095)" />
      ))}
    </g>
  );
}
