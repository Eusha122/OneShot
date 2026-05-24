import { useEffect, useState, useRef } from "react";
import { Play, RotateCcw } from "lucide-react";
import type { ForceMotionParams } from "../visual-blocks/visualBlockTypes";

const defaultParams: ForceMotionParams = {
  mass: 10,
  force: 50,
  friction: 0.2,
};

const viewport = {
  width: 640,
  height: 220,
  groundY: 180,
  blockWidth: 80,
  blockHeight: 60,
};

export function ForceMotionSimulation({ initialParams = defaultParams }: { initialParams?: ForceMotionParams }) {
  const [params, setParams] = useState(initialParams);
  const [positionX, setPositionX] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const [velocity, setVelocity] = useState(0);
  const [message, setMessage] = useState("");

  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const vRef = useRef<number>(0);
  const xRef = useRef<number>(50);

  const g = 9.8;
  const maxFrictionForce = params.friction * params.mass * g;
  const netForce = Math.max(0, params.force - maxFrictionForce);
  const acceleration = params.force > maxFrictionForce ? netForce / params.mass : 0;

  // Reset block when params change
  useEffect(() => {
    stopAnimation();
    setPositionX(50);
    setVelocity(0);
    xRef.current = 50;
    vRef.current = 0;
    
    if (params.force <= maxFrictionForce && params.force > 0) {
      setMessage("Applied force is too small to overcome static friction.");
    } else if (params.force === 0) {
      setMessage("No force applied.");
    } else {
      setMessage("Friction overcome! The block will accelerate.");
    }
  }, [params, maxFrictionForce]);

  function stopAnimation() {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsPlaying(false);
  }

  function startAnimation() {
    stopAnimation();
    xRef.current = 50;
    vRef.current = 0;
    setPositionX(50);
    setVelocity(0);
    setIsPlaying(true);
    lastTimeRef.current = performance.now();
    
    function animate(now: number) {
      const dt = (now - lastTimeRef.current) / 1000; // in seconds
      lastTimeRef.current = now;

      if (params.force > maxFrictionForce) {
        // Accelerate
        vRef.current += acceleration * dt;
        xRef.current += vRef.current * 100 * dt; // scale factor 100px/meter
      } else {
        vRef.current = 0;
      }

      // Constrain within bounds
      const limitX = viewport.width - viewport.blockWidth - 50;
      if (xRef.current >= limitX) {
        xRef.current = limitX;
        vRef.current = 0;
        setPositionX(limitX);
        setVelocity(0);
        setIsPlaying(false);
      } else {
        setPositionX(xRef.current);
        setVelocity(vRef.current);
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    animationRef.current = requestAnimationFrame(animate);
  }

  useEffect(() => {
    return () => {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <div className="mt-3 rounded-lg bg-[#111111] p-3 text-[#f5f5f5]">
      {/* Simulation Screen */}
      <div className="relative h-56 overflow-hidden rounded-md bg-[#0d0d0d]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        <svg viewBox={`0 0 ${viewport.width} ${viewport.height}`} className="relative h-full w-full">
          {/* Ground */}
          <line
            x1="0"
            y1={viewport.groundY}
            x2={viewport.width}
            y2={viewport.groundY}
            stroke="#374151"
            strokeWidth="3"
          />

          {/* Friction Surface Highlight (if friction > 0) */}
          {params.friction > 0 && (
            <line
              x1="0"
              y1={viewport.groundY + 1.5}
              x2={viewport.width}
              y2={viewport.groundY + 1.5}
              stroke="#ef4444"
              strokeDasharray="4,6"
              strokeWidth="2"
              opacity={params.friction}
            />
          )}

          {/* Block */}
          <g transform={`translate(${positionX}, ${viewport.groundY - viewport.blockHeight})`}>
            {/* Crate Body */}
            <rect
              width={viewport.blockWidth}
              height={viewport.blockHeight}
              rx="4"
              fill="url(#blockGrad)"
              stroke="#4b5563"
              strokeWidth="2"
            />
            {/* Mass Label */}
            <text
              x={viewport.blockWidth / 2}
              y={viewport.blockHeight / 2 + 5}
              textAnchor="middle"
              className="text-xs font-bold fill-[#ffffff] select-none"
            >
              {params.mass} kg
            </text>

            {/* FORCE VECTORS */}
            {/* 1. Applied Force Arrow (Right) */}
            {params.force > 0 && (
              <g transform={`translate(${viewport.blockWidth}, ${viewport.blockHeight / 2})`}>
                <line
                  x1="0"
                  y1="0"
                  x2={Math.min(100, params.force * 1.5)}
                  y2="0"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  markerEnd="url(#arrowBlue)"
                />
                <text
                  x={Math.min(100, params.force * 1.5) / 2}
                  y="-8"
                  textAnchor="middle"
                  className="text-[10px] font-bold fill-[#3b82f6] select-none"
                >
                  F = {params.force} N
                </text>
              </g>
            )}

            {/* 2. Friction Arrow (Left) */}
            {params.friction > 0 && params.force > 0 && (
              <g transform={`translate(0, ${viewport.blockHeight / 2})`}>
                <line
                  x1="0"
                  y1="0"
                  x2={-Math.min(100, maxFrictionForce * 1.5)}
                  y2="0"
                  stroke="#ef4444"
                  strokeWidth="3"
                  markerEnd="url(#arrowRed)"
                />
                <text
                  x={-Math.min(100, maxFrictionForce * 1.5) / 2}
                  y="-8"
                  textAnchor="middle"
                  className="text-[10px] font-bold fill-[#ef4444] select-none"
                >
                  f = {maxFrictionForce.toFixed(1)} N
                </text>
              </g>
            )}

            {/* 3. Normal Force (Up) */}
            <g transform={`translate(${viewport.blockWidth / 2}, 0)`}>
              <line
                x1="0"
                y1="0"
                x2="0"
                y2={-Math.min(50, params.mass * 2.5)}
                stroke="#10b981"
                strokeWidth="2.5"
                markerEnd="url(#arrowGreen)"
              />
              <text
                x="8"
                y={-Math.min(50, params.mass * 2.5) / 2}
                className="text-[9px] fill-[#10b981] select-none font-semibold"
              >
                Fn
              </text>
            </g>

            {/* 4. Gravity Force (Down) */}
            <g transform={`translate(${viewport.blockWidth / 2}, ${viewport.blockHeight})`}>
              <line
                x1="0"
                y1="0"
                x2="0"
                y2={Math.min(50, params.mass * 2.5)}
                stroke="#f59e0b"
                strokeWidth="2.5"
                markerEnd="url(#arrowOrange)"
              />
              <text
                x="8"
                y={Math.min(50, params.mass * 2.5) / 2}
                className="text-[9px] fill-[#f59e0b] select-none font-semibold"
              >
                Fg
              </text>
            </g>
          </g>

          {/* Definitions/Defs for Gradients and Arrows */}
          <defs>
            <linearGradient id="blockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>
            <marker id="arrowBlue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#3b82f6" />
            </marker>
            <marker id="arrowRed" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#ef4444" />
            </marker>
            <marker id="arrowGreen" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#10b981" />
            </marker>
            <marker id="arrowOrange" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#f59e0b" />
            </marker>
          </defs>
        </svg>

        {/* Real-time Overlay Status */}
        <div className="absolute left-3 top-3 rounded bg-black/75 px-2 py-1 text-[10px] font-mono text-[#f5f5f5] backdrop-blur">
          <div>Acc: {acceleration.toFixed(2)} m/s²</div>
          <div>Vel: {velocity.toFixed(1)} m/s</div>
        </div>
      </div>

      {/* Control Panel / Sliders */}
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Slider
          label="Applied Force"
          max={100}
          min={0}
          step={1}
          value={params.force}
          unit="N"
          color="#3b82f6"
          onChange={(force) => setParams((current) => ({ ...current, force }))}
        />
        <Slider
          label="Mass"
          max={50}
          min={2}
          step={1}
          value={params.mass}
          unit="kg"
          color="#f59e0b"
          onChange={(mass) => setParams((current) => ({ ...current, mass }))}
        />
        <Slider
          label="Friction Coefficient"
          max={0.8}
          min={0}
          step={0.01}
          value={params.friction}
          unit="μ"
          color="#ef4444"
          onChange={(friction) => setParams((current) => ({ ...current, friction }))}
        />
      </div>

      {/* Footer Metrics and Actions */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#9ca3af]">
        <div className="flex flex-col gap-1">
          <span className="text-[#e5e7eb] font-semibold">{message}</span>
          <div className="flex gap-x-4">
            <span>Friction Force: {maxFrictionForce.toFixed(1)} N</span>
            <span>Net Force: {netForce.toFixed(1)} N</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={startAnimation}
            disabled={isPlaying}
            className="inline-flex items-center gap-1.5 rounded bg-[#f5f5f5] px-2.5 py-1 text-[11px] font-semibold text-[#0a0a0a] transition hover:bg-white"
          >
            <Play size={11} fill="currentColor" />
            Play
          </button>
          <button
            type="button"
            onClick={() => {
              stopAnimation();
              setPositionX(50);
              setVelocity(0);
              xRef.current = 50;
              vRef.current = 0;
            }}
            className="inline-flex items-center gap-1.5 rounded border border-[#374151] px-2.5 py-1 text-[11px] font-semibold text-[#9ca3af] transition hover:text-[#f5f5f5] hover:bg-[#1a1a1a]"
          >
            <RotateCcw size={11} />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  max,
  min,
  onChange,
  step,
  unit,
  value,
  color,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  unit: string;
  value: number;
  color: string;
}) {
  return (
    <div className="block">
      <div className="flex items-center justify-between text-xs text-[#9ca3af]">
        <span>{label}</span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={Number(value.toFixed(2))}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) {
                onChange(Math.max(min, Math.min(max, val)));
              }
            }}
            className="w-14 rounded border border-[#333] bg-[#1a1a1a] px-1 py-0.5 text-right text-xs text-[#f5f5f5] focus:border-[#f5f5f5] focus:outline-none"
          />
          <span className="text-[10px] text-[#6b7280]">{unit}</span>
        </div>
      </div>
      <input
        className="mt-2 w-full cursor-pointer accent-[currentColor]"
        style={{ color }}
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="range"
        value={value}
      />
    </div>
  );
}
