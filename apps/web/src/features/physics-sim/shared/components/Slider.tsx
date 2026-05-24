import React from "react";

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit: string;
}) {
  return (
    <div className="block rounded border border-[#222] bg-[#1a1a1a] p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-[#9ca3af]">
        <span className="font-medium text-gray-300">{label}</span>
        <span className="rounded bg-black/50 px-2 py-0.5 font-mono text-emerald-400">
          {Number(value).toFixed(step < 1 ? 2 : 1)} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-emerald-500"
      />
    </div>
  );
}
