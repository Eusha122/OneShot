import { useEffect, useState, useRef } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import type { SimulationSchema, SimulationObject } from "./SimulationSchema";

// -- Object Registry Implementations --
// These would eventually be moved to their own files.

function PendulumObject({ obj, time, params }: { obj: SimulationObject, time: number, params: Record<string, number> }) {
  const length = Number(params.length ?? obj.params.length ?? 150);
  const gravity = Number(params.gravity ?? obj.params.gravity ?? 9.8);
  const initialAngle = Number(params.initialAngle ?? obj.params.initialAngle ?? 45);

  // Math: theta(t) = theta0 * cos(sqrt(g/L) * t)
  // Time is in seconds.
  const angleRad = (initialAngle * Math.PI) / 180;
  const omega = Math.sqrt(gravity / (length / 100)); // scaling length for visual speed
  const currentAngle = angleRad * Math.cos(omega * time);

  const pivotX = 320;
  const pivotY = 50;
  const bobX = pivotX + length * Math.sin(currentAngle);
  const bobY = pivotY + length * Math.cos(currentAngle);

  return (
    <g>
      {/* Ceiling */}
      <line x1={pivotX - 50} y1={pivotY} x2={pivotX + 50} y2={pivotY} stroke="#111827" strokeWidth="4" />
      <line x1={pivotX} y1={pivotY} x2={bobX} y2={bobY} stroke="#4b5563" strokeWidth="2" />
      <circle cx={bobX} cy={bobY} r="15" fill="#3b82f6" />
    </g>
  );
}

function SpringObject({ obj, time, params }: { obj: SimulationObject, time: number, params: Record<string, number> }) {
  const k = Number(params.k ?? obj.params.k ?? 10);
  const mass = Number(params.mass ?? obj.params.mass ?? 5);
  const amplitude = Number(params.amplitude ?? obj.params.amplitude ?? 100);

  // Math: x(t) = A * cos(sqrt(k/m) * t)
  const omega = Math.sqrt(k / mass);
  const displacement = amplitude * Math.cos(omega * time);
  
  const anchorX = 50;
  const anchorY = 110;
  const restLength = 300;
  const blockX = anchorX + restLength + displacement;

  return (
    <g>
      {/* Wall */}
      <line x1={anchorX} y1="30" x2={anchorX} y2="190" stroke="#111827" strokeWidth="6" />
      {/* Simple spring representation: straight line for now, can be made into zig-zag later */}
      <line x1={anchorX} y1={anchorY} x2={blockX} y2={anchorY} stroke="#4b5563" strokeWidth="2" strokeDasharray="4,4" />
      <rect x={blockX} y={anchorY - 20} width="40" height="40" rx="4" fill="#ef4444" />
    </g>
  );
}

function WaveObject({ obj, time, params }: { obj: SimulationObject, time: number, params: Record<string, number> }) {
  const amplitude = Number(params.amplitude ?? obj.params.amplitude ?? 40);
  const frequency = Number(params.frequency ?? obj.params.frequency ?? 2);
  const wavelength = Number(params.wavelength ?? obj.params.wavelength ?? 100);

  const points = [];
  for (let x = 0; x <= 640; x += 5) {
    const k = (2 * Math.PI) / wavelength;
    const w = 2 * Math.PI * frequency;
    // y = A * sin(kx - wt)
    const y = 110 + amplitude * Math.sin(k * x - w * time);
    points.push(`${x},${y}`);
  }

  return (
    <polyline points={points.join(" ")} fill="none" stroke="#10b981" strokeWidth="3" />
  );
}

function MassOnInclineObject({ obj, time, params }: { obj: SimulationObject, time: number, params: Record<string, number> }) {
  const angleDeg = Number(params.angle ?? obj.params.angle ?? 30);
  const mass = Number(params.mass ?? obj.params.mass ?? 10);
  const mu = Number(params.friction ?? obj.params.friction ?? 0.1);
  const gravity = 9.8;

  // Calculate motion down the incline
  const angleRad = (angleDeg * Math.PI) / 180;
  const forceDown = mass * gravity * Math.sin(angleRad);
  const frictionForce = mu * mass * gravity * Math.cos(angleRad);
  const netForce = forceDown - frictionForce;
  
  // Acceleration
  const a = netForce > 0 ? netForce / mass : 0;
  // Position over time (s = 1/2 a t^2)
  const s = 0.5 * a * time * time * 20; // scale for visual speed
  
  // Geometry
  const startX = 100;
  const startY = 180;
  const rampLength = 400;
  const endX = startX + rampLength * Math.cos(angleRad);
  const endY = startY - rampLength * Math.sin(angleRad);
  
  // Block geometry
  const blockDist = Math.min(rampLength - 50, s);
  const blockX = startX + (rampLength - blockDist - 40) * Math.cos(angleRad);
  const blockY = startY - (rampLength - blockDist - 40) * Math.sin(angleRad);

  return (
    <g>
      {/* Ground and Ramp */}
      <line x1={startX} y1={startY} x2={endX + 50} y2={startY} stroke="#111827" strokeWidth="4" />
      <line x1={startX} y1={startY} x2={endX} y2={endY} stroke="#4b5563" strokeWidth="6" />
      
      {/* Angle arc */}
      <path d={`M ${startX + 40} ${startY} A 40 40 0 0 0 ${startX + 40 * Math.cos(angleRad)} ${startY - 40 * Math.sin(angleRad)}`} fill="none" stroke="#6b7280" strokeWidth="2" />
      <text x={startX + 50} y={startY - 10} fontSize="12" fill="#6b7280">{angleDeg.toFixed(0)}°</text>
      
      {/* The mass block */}
      <g transform={`translate(${blockX}, ${blockY}) rotate(${-angleDeg})`}>
        <rect x="0" y="-30" width="40" height="30" fill="#f59e0b" rx="2" />
        <text x="20" y="-10" textAnchor="middle" fontSize="12" fill="#fff" fontWeight="bold">{mass}kg</text>
      </g>
    </g>
  );
}

// Registry router
function ObjectRenderer({ obj, time, params }: { obj: SimulationObject, time: number, params: Record<string, number> }) {
  switch (obj.type) {
    case "pendulum": return <PendulumObject obj={obj} time={time} params={params} />;
    case "spring": return <SpringObject obj={obj} time={time} params={params} />;
    case "wave": return <WaveObject obj={obj} time={time} params={params} />;
    case "mass-on-incline": return <MassOnInclineObject obj={obj} time={time} params={params} />;
    default: return <text x="50" y="50" fill="red">Unknown object: {obj.type}</text>;
  }
}

// -- Main Engine Component --

export function SimulationEngine({ schema }: { schema: SimulationSchema }) {
  // Safe access for potentially malformed LLM schemas
  const sliders = schema?.sliders || [];
  const objects = schema?.objects || [];

  // Initialize dynamic params from sliders
  const initialParams: Record<string, number> = {};
  sliders.forEach(s => {
    initialParams[s.key] = s.value;
  });

  const [params, setParams] = useState<Record<string, number>>(initialParams);
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);

  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  function stopAnimation() {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsPlaying(false);
  }

  function startAnimation() {
    if (isPlaying) return;
    setIsPlaying(true);
    lastTimeRef.current = performance.now();
    
    function animate(now: number) {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      setTime(prev => prev + dt);
      animationRef.current = requestAnimationFrame(animate);
    }
    animationRef.current = requestAnimationFrame(animate);
  }

  function resetAnimation() {
    stopAnimation();
    setTime(0);
  }

  useEffect(() => {
    return () => {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <div className="mt-3 rounded-lg bg-[#111111] p-3 text-[#f5f5f5]">
      <div className="mb-4 text-center">
        <h3 className="font-bold text-white text-lg tracking-tight">{schema?.title || "Generative Simulation"}</h3>
        <p className="text-sm text-[#9ca3af] mt-1">{schema?.description || "Interactive physical simulation"}</p>
      </div>

      {/* Simulation Screen */}
      <div 
        className="relative h-56 overflow-hidden rounded-md bg-[#0d1117] shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] border-[4px] border-[#1f2937]"
      >
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />
        
        <svg viewBox="0 0 640 220" className="relative h-full w-full drop-shadow-md">
          {objects.map((obj, i) => (
            <ObjectRenderer key={obj.id || i} obj={obj} time={time} params={params} />
          ))}
        </svg>

        <div className="absolute right-3 top-3 rounded bg-black/60 border border-white/10 px-3 py-1.5 text-xs font-mono text-emerald-400 backdrop-blur">
          Time: {time.toFixed(2)} s
        </div>
      </div>

      {/* Control Panel / Dynamic Sliders */}
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {sliders.map((slider, i) => (
          <div key={slider.key || i} className="block">
            <div className="flex items-center justify-between text-xs text-[#9ca3af]">
              <span>{slider.label}</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={slider.min}
                  max={slider.max}
                  step={slider.step}
                  value={Number(params[slider.key]?.toFixed(2) || slider.value)}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) {
                      setParams(curr => ({ ...curr, [slider.key]: Math.max(slider.min, Math.min(slider.max, val)) }));
                    }
                  }}
                  className="w-14 rounded border border-[#333] bg-[#1a1a1a] px-1 py-0.5 text-right text-xs text-[#f5f5f5] focus:border-[#f5f5f5] focus:outline-none"
                />
                {slider.unit && <span className="text-[10px] text-[#6b7280]">{slider.unit}</span>}
              </div>
            </div>
            <input
              className="mt-2 w-full cursor-pointer accent-[currentColor]"
              style={{ color: slider.color || "#3b82f6" }}
              max={slider.max}
              min={slider.min}
              onChange={(event) => setParams(curr => ({ ...curr, [slider.key]: Number(event.target.value) }))}
              step={slider.step}
              type="range"
              value={params[slider.key] ?? slider.value}
            />
          </div>
        ))}
      </div>

      {/* Footer Metrics and Actions */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#9ca3af]">
        <div className="flex flex-col gap-1">
          <span className="text-[#e5e7eb] font-semibold text-[10px]">Generative Schema Renderer</span>
        </div>
        <div className="flex gap-2">
          {isPlaying ? (
            <button
              type="button"
              onClick={stopAnimation}
              className="inline-flex items-center gap-1.5 rounded bg-[#f5f5f5] px-2.5 py-1 text-[11px] font-semibold text-[#0a0a0a] transition hover:bg-white"
            >
              <Pause size={11} fill="currentColor" />
              Pause
            </button>
          ) : (
            <button
              type="button"
              onClick={startAnimation}
              className="inline-flex items-center gap-1.5 rounded bg-[#f5f5f5] px-2.5 py-1 text-[11px] font-semibold text-[#0a0a0a] transition hover:bg-white"
            >
              <Play size={11} fill="currentColor" />
              Play
            </button>
          )}
          <button
            type="button"
            onClick={resetAnimation}
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
