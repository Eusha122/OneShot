import React from "react";

export function Arrow({
  color,
  label,
  x1,
  x2,
  y1,
  y2,
}: {
  color: string;
  label: string;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headX = x2 - Math.cos(angle) * 10;
  const headY = y2 - Math.sin(angle) * 10;

  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeLinecap="round" strokeWidth="3" />
      <path
        d={`M${x2} ${y2} L${headX - Math.sin(angle) * 5} ${headY + Math.cos(angle) * 5} L${headX + Math.sin(angle) * 5} ${headY - Math.cos(angle) * 5} Z`}
        fill={color}
      />
      <text
        x={(x1 + x2) / 2}
        y={(y1 + y2) / 2 - 9}
        textAnchor="middle"
        className="fill-[#d1d5db] text-[10px]"
      >
        {label}
      </text>
    </g>
  );
}
