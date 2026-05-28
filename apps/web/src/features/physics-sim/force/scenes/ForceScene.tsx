import React, { useRef, useMemo } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { formulaById, PhysicsLabParams } from "../../sscPhysicsEngine";
import { calculateForces } from "../utils/calculateForces";
import { ForceGraphs } from "../graphs/ForceGraphs";
import { MassBlock, MassBlockRef } from "../objects/MassBlock";
import { CircularOrbit, CircularOrbitRef } from "../objects/CircularOrbit";
import { GravityBodies } from "../objects/GravityBodies";
import { Particle } from "../objects/Particle";
import { ForceVector } from "../objects/ForceVector";
import { CollisionEngine, CollisionEngineRef } from "../collision/CollisionEngine";
import { calculateCollision } from "../collision/collisionMath";
import { usePhysicsEngine } from "../../shared/usePhysicsEngine";

const MemoizedForceGraphs = React.memo(ForceGraphs);

interface ForceSceneProps {
  params: PhysicsLabParams;
  updateParam: <K extends keyof PhysicsLabParams>(key: K, value: PhysicsLabParams[K]) => void;
}

export function ForceScene({ params, updateParam }: ForceSceneProps) {
  const formulaId = params.formulaId || "newton-second-law";
  const formulaDef = formulaById(formulaId);

  const state = calculateForces(formulaId, params as any);
  const collisionState = formulaId === "conservation" ? calculateCollision(params) : null;

  const massBlockRef = useRef<MassBlockRef>(null);
  const collisionEngineRef = useRef<CollisionEngineRef>(null);
  const circularOrbitRef = useRef<CircularOrbitRef>(null);
  const momentumGroupRef = useRef<SVGGElement>(null);
  
  const {
    isPlaying,
    uiTimeFrac,
    timeFracRef,
    startAnimation,
    stopAnimation,
    resetAnimation,
  } = usePhysicsEngine({
    duration: state.time || 1,
    throttleMs: 100, // Update heavy UI at ~10 FPS
    onUpdate: (timeFrac) => {
      // Direct DOM updates at 60 FPS
      if (massBlockRef.current) massBlockRef.current.updateTimeFrac(timeFrac);
      if (collisionEngineRef.current) collisionEngineRef.current.updateTimeFrac(timeFrac);
      if (circularOrbitRef.current) circularOrbitRef.current.updateTimeFrac(timeFrac);
      
      if (momentumGroupRef.current) {
        momentumGroupRef.current.style.transform = `translate3d(${100 + timeFrac * 400}px, 128px, 0)`;
      }
    }
  });

  // Formula Overlay Builder
  let formulaOverlay = "";
  switch (formulaId) {
    case "momentum": 
      formulaOverlay = `p = ${(state.mass || 0).toFixed(1)} × ${(state.velocity || 0).toFixed(1)} = ${(state.momentum || 0).toFixed(1)} kg·m/s`; 
      break;
    case "newton-second-law": 
      formulaOverlay = `F = ${(state.mass || 0).toFixed(1)} × ${(state.acceleration || 0).toFixed(1)} = ${(state.force || 0).toFixed(1)} N`; 
      break;
    case "impulse": 
      formulaOverlay = `J = ${(state.force || 0).toFixed(1)} × ${(state.time || 0).toFixed(1)} = ${(state.momentum || 0).toFixed(1)} N·s`; 
      break;
    case "conservation": 
      if (collisionState) {
        formulaOverlay = `Σp = ${collisionState.totalMomentumBefore.toFixed(1)} (Conserved)`; 
      }
      break;
    case "centripetal": 
      formulaOverlay = `F = (${(state.mass || 0).toFixed(1)} × ${(state.velocity || 0).toFixed(1)}²) / ${(state.radius || 1).toFixed(1)} = ${(state.force || 0).toFixed(1)} N`; 
      break;
    case "gravitational-force": 
      formulaOverlay = `F ∝ (${(state.particles?.[0]?.mass || 0)} × ${(state.particles?.[1]?.mass || 0)}) / ${(state.distance || 1)}²`; 
      break;
  }

  return (
    <div className="mt-3 rounded-lg bg-[#0d0d0d] p-4 text-[#f5f5f5] shadow-xl border border-[#333]">
      <div className="mb-4 text-center">
        <h3 className="font-bold text-white text-lg tracking-tight">{formulaDef?.title || "Force"}</h3>
        <p className="text-sm text-[#9ca3af] mt-1">{formulaDef?.expression}</p>
      </div>

      {/* Main Simulation Viewport */}
      <div className="relative h-64 overflow-hidden rounded-md bg-[#111111] border-[4px] border-[#222]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
        
        {/* Formula Overlay */}
        <div className="absolute top-3 left-3 bg-black/60 px-3 py-1.5 rounded font-mono text-sm border border-white/10 text-emerald-400">
          {formulaOverlay}
        </div>

        <svg viewBox="0 0 640 256" className="relative h-full w-full drop-shadow-md">
          {formulaId === "momentum" && (
            <g>
              {/* Simple momentum particle moving */}
              <line x1="40" y1="128" x2="600" y2="128" stroke="#374151" strokeWidth="2" strokeDasharray="5,5" />
              <g ref={momentumGroupRef} style={{ transform: `translate3d(100px, 128px, 0)` }}>
                <Particle particle={{ mass: state.mass || 1, velocity: state.velocity || 0, position: 0 }} x={0} y={0} />
                <ForceVector x={20} y={0} magnitude={state.momentum || 0} direction="right" label={`p=${state.momentum?.toFixed(1)}`} color="#a855f7" scale={1.5} />
              </g>
            </g>
          )}

          {(formulaId === "newton-second-law" || formulaId === "impulse") && (
            <MassBlock ref={massBlockRef} state={state} />
          )}

          {formulaId === "conservation" && collisionState && (
            <CollisionEngine ref={collisionEngineRef} state={collisionState} />
          )}

          {formulaId === "centripetal" && (
            <CircularOrbit ref={circularOrbitRef} state={state} />
          )}

          {formulaId === "gravitational-force" && (
            <GravityBodies state={state} />
          )}
        </svg>
      </div>

      {/* Control Panel / Dynamic Sliders */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {formulaId === "momentum" && (
          <>
            <Slider label="Mass (m)" value={params.mass} min={1} max={50} step={1} onChange={(v) => updateParam("mass", v)} unit="kg" />
            <Slider label="Velocity (v)" value={params.v} min={0} max={100} step={1} onChange={(v) => updateParam("v", v)} unit="m/s" />
          </>
        )}
        
        {formulaId === "newton-second-law" && (
          <>
            <Slider label="Mass (m)" value={params.mass} min={1} max={50} step={1} onChange={(v) => updateParam("mass", v)} unit="kg" />
            <Slider label="Applied Force (F)" value={params.force} min={0} max={200} step={5} onChange={(v) => updateParam("force", v)} unit="N" />
          </>
        )}

        {formulaId === "impulse" && (
          <>
            <Slider label="Mass (m)" value={params.mass} min={1} max={50} step={1} onChange={(v) => updateParam("mass", v)} unit="kg" />
            <Slider label="Force Spike (F)" value={params.force} min={0} max={1000} step={10} onChange={(v) => updateParam("force", v)} unit="N" />
            <Slider label="Time (t)" value={params.t} min={0.1} max={2} step={0.1} onChange={(v) => updateParam("t", v)} unit="s" />
          </>
        )}

        {formulaId === "conservation" && (
          <>
            <Slider label="Mass 1" value={params.mass1} min={1} max={50} step={1} onChange={(v) => updateParam("mass1", v)} unit="kg" />
            <Slider label="Initial Vel 1" value={params.u1} min={-50} max={50} step={1} onChange={(v) => updateParam("u1", v)} unit="m/s" />
            <Slider label="Mass 2" value={params.mass2} min={1} max={50} step={1} onChange={(v) => updateParam("mass2", v)} unit="kg" />
            <Slider label="Initial Vel 2" value={params.u2} min={-50} max={50} step={1} onChange={(v) => updateParam("u2", v)} unit="m/s" />
          </>
        )}

        {formulaId === "centripetal" && (
          <>
            <Slider label="Mass (m)" value={params.mass} min={1} max={50} step={1} onChange={(v) => updateParam("mass", v)} unit="kg" />
            <Slider label="Velocity (v)" value={params.v} min={1} max={50} step={1} onChange={(v) => updateParam("v", v)} unit="m/s" />
            <Slider label="Radius (r)" value={params.radius} min={5} max={30} step={1} onChange={(v) => updateParam("radius", v)} unit="m" />
          </>
        )}

        {formulaId === "gravitational-force" && (
          <>
            <Slider label="Mass 1 (m₁)" value={params.mass1} min={1} max={100} step={1} onChange={(v) => updateParam("mass1", v)} unit="kg" />
            <Slider label="Mass 2 (m₂)" value={params.mass2} min={1} max={100} step={1} onChange={(v) => updateParam("mass2", v)} unit="kg" />
            <Slider label="Distance (r)" value={params.distance} min={5} max={30} step={1} onChange={(v) => updateParam("distance", v)} unit="m" />
          </>
        )}
      </div>

      <div className="mt-4 flex items-center justify-end gap-3 border-t border-[#333] pt-4">
        <button
          onClick={isPlaying ? stopAnimation : startAnimation}
          className="flex items-center gap-2 rounded bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-gray-200"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button
          onClick={resetAnimation}
          className="flex items-center gap-2 rounded border border-[#444] px-4 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-[#222]"
        >
          <RotateCcw size={16} />
          Reset
        </button>
      </div>

      <div className="mt-6 border-t border-[#333] pt-6">
        <MemoizedForceGraphs state={state} time={uiTimeFrac} formulaId={formulaId} />
      </div>
    </div>
  );
}

// Simple internal slider for clean rendering
function Slider({ label, value, min, max, step, onChange, unit }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit: string;
}) {
  return (
    <div className="block bg-[#1a1a1a] p-3 rounded border border-[#222]">
      <div className="flex items-center justify-between text-xs text-[#9ca3af] mb-2">
        <span className="font-medium text-gray-300">{label}</span>
        <span className="bg-black/50 px-2 py-0.5 rounded font-mono text-emerald-400">
          {Number(value).toFixed(1)} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#333] outline-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
      />
    </div>
  );
}
