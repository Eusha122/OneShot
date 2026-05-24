import React from "react";
import { ParticleState } from "../engine/ForceState";

interface ParticleProps {
  particle: ParticleState;
  x: number;
  y: number;
  color?: string;
  glowColor?: string;
  showMass?: boolean;
}

export function Particle({ particle, x, y, color = "#3b82f6", glowColor = "rgba(59, 130, 246, 0.4)", showMass = true }: ParticleProps) {
  // Scale particle radius logarithmically with mass so 100kg isn't 100x bigger than 1kg
  const baseRadius = 8;
  const radius = particle.mass > 0 ? baseRadius + Math.log10(Math.max(1, particle.mass)) * 5 : baseRadius;

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Outer Glow */}
      <circle cx="0" cy="0" r={radius * 2.5} fill={glowColor} />
      
      {/* Particle Core */}
      <circle cx="0" cy="0" r={radius} fill="#f8fafc" />
      <circle cx="0" cy="0" r={radius * 0.7} fill={color} />
      
      {/* Labels */}
      {showMass && (
        <text y={radius + 15} fill="#9ca3af" fontSize="11" textAnchor="middle" fontWeight="bold">
          {particle.mass}kg
        </text>
      )}
    </g>
  );
}
