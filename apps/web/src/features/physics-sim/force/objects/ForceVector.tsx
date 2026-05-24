import React from "react";

interface ForceVectorProps {
  x: number;
  y: number;
  magnitude: number;
  direction: "left" | "right" | "up" | "down" | "inward" | "outward" | number; // Angle in degrees or predefined string
  label?: string;
  color?: string;
  scale?: number; // pixels per unit of magnitude
}

export function ForceVector({ x, y, magnitude, direction, label, color = "#ef4444", scale = 2 }: ForceVectorProps) {
  if (magnitude === 0) return null; // Don't draw vector for 0 magnitude

  // Base length calculation
  let length = Math.abs(magnitude) * scale;
  
  // Cap length to avoid massive vectors flying off screen
  if (length > 300) length = 300;
  if (length < 15) length = 15; // minimum readable length

  // Calculate rotation based on direction
  let rotation = 0;
  if (typeof direction === "string") {
    switch (direction) {
      case "right": rotation = 0; break;
      case "down": rotation = 90; break;
      case "left": rotation = 180; break;
      case "up": rotation = 270; break;
      case "inward": rotation = 90; break; // specific use case for orbits
      case "outward": rotation = 270; break;
    }
  } else {
    rotation = direction;
  }

  // Handle negative magnitude (flip vector)
  if (magnitude < 0) {
    rotation += 180;
  }

  return (
    <g transform={`translate(${x}, ${y}) rotate(${rotation})`}>
      {/* Arrow body */}
      <line x1="0" y1="0" x2={length} y2="0" stroke={color} strokeWidth="3" strokeLinecap="round" />
      
      {/* Arrow head */}
      <polygon points={`${length},0 ${length - 10},-6 ${length - 10},6`} fill={color} />
      
      {/* Glow effect */}
      <line x1="0" y1="0" x2={length} y2="0" stroke={color} strokeWidth="8" strokeOpacity="0.2" strokeLinecap="round" />

      {/* Label */}
      {label && (
        <text
          x={length / 2}
          y="-12"
          fill={color}
          fontSize="14"
          fontWeight="bold"
          textAnchor="middle"
          // We unrotate the text so it's always readable, unless we want it to follow the line
          transform={`rotate(${-rotation}, ${length / 2}, -12)`}
        >
          {label}
        </text>
      )}
    </g>
  );
}
