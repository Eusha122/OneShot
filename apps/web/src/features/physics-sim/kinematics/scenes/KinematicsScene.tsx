import React, { useEffect, useState, useRef } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { formulaById, PhysicsLabParams } from "../../sscPhysicsEngine";
import { calculateKinematics } from "../utils/calculateKinematics";
import { ParticleObject } from "../objects/ParticleObject";
import { VelocityVector } from "../objects/VelocityVector";
import { AccelerationVector } from "../objects/AccelerationVector";
import { MotionTrail } from "../objects/MotionTrail";
import { KinematicsGraphs } from "../graphs/KinematicsGraphs";

interface KinematicsSceneProps {
  params: PhysicsLabParams;
  updateParam: <K extends keyof PhysicsLabParams>(key: K, value: PhysicsLabParams[K]) => void;
}

export function KinematicsScene({ params, updateParam }: KinematicsSceneProps) {
  const formulaId = params.formulaId || "velocity";
  const formulaDef = formulaById(formulaId);

  // Compute live mathematical state
  const state = calculateKinematics(formulaId, params as any);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeFrac, setTimeFrac] = useState(0); // 0 to 1
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  function startAnimation() {
    if (isPlaying) return;
    setIsPlaying(true);
    if (timeFrac >= 1) setTimeFrac(0);
    lastTimeRef.current = performance.now();
    
    function animate(now: number) {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      
      setTimeFrac(prev => {
        // Physical duration is state.t, we animate 1 real second = 1 physical second
        const duration = Math.max(0.5, state.t);
        const nextFrac = prev + dt / duration;
        if (nextFrac >= 1) {
          setIsPlaying(false);
          return 1;
        }
        animationRef.current = requestAnimationFrame(animate);
        return nextFrac;
      });
    }
    animationRef.current = requestAnimationFrame(animate);
  }

  function pauseAnimation() {
    setIsPlaying(false);
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
  }

  function resetAnimation() {
    pauseAnimation();
    setTimeFrac(0);
  }

  // Formula Overlay string builder
  let formulaOverlay = "";
  switch (formulaId) {
    case "velocity": formulaOverlay = `v = ${state.s.toFixed(1)} / ${state.t.toFixed(1)} = ${state.v.toFixed(1)} m/s`; break;
    case "acceleration": formulaOverlay = `a = (${state.v.toFixed(1)} - ${state.u.toFixed(1)}) / ${state.t.toFixed(1)} = ${state.a.toFixed(1)} m/s²`; break;
    case "motion-1": formulaOverlay = `v = ${state.u.toFixed(1)} + (${state.a.toFixed(1)} × ${state.t.toFixed(1)}) = ${state.v.toFixed(1)} m/s`; break;
    case "motion-2": formulaOverlay = `s = ((${state.u.toFixed(1)} + ${state.v.toFixed(1)}) / 2) × ${state.t.toFixed(1)} = ${state.s.toFixed(1)} m`; break;
    case "motion-3": formulaOverlay = `s = (${state.u.toFixed(1)} × ${state.t.toFixed(1)}) + ½(${state.a.toFixed(1)} × ${state.t.toFixed(1)}²) = ${state.s.toFixed(1)} m`; break;
    case "motion-4": formulaOverlay = `v² = ${state.u.toFixed(1)}² + 2(${state.a.toFixed(1)} × ${state.s.toFixed(1)}) = ${(state.v*state.v).toFixed(1)} (v=${state.v.toFixed(1)})`; break;
  }

  return (
    <div className="mt-3 rounded-lg bg-[#0d0d0d] p-4 text-[#f5f5f5] shadow-xl border border-[#333]">
      <div className="mb-4 text-center">
        <h3 className="font-bold text-white text-lg tracking-tight">{formulaDef?.title || "Kinematics"}</h3>
        <p className="text-sm text-[#9ca3af] mt-1">{formulaDef?.expression}</p>
      </div>

      {/* Main Simulation Viewport */}
      <div className="relative h-56 overflow-hidden rounded-md bg-[#111111] border-[4px] border-[#222]">
        {/* Coordinate Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
        
        {/* Formula Live Overlay */}
        <div className="absolute top-3 left-3 bg-black/60 px-3 py-1.5 rounded font-mono text-sm border border-white/10 text-emerald-400">
          {formulaOverlay}
        </div>

        {/* Time Overlay */}
        <div className="absolute top-3 right-3 bg-black/60 px-3 py-1.5 rounded font-mono text-sm border border-white/10 text-gray-300">
          t = {(timeFrac * state.t).toFixed(2)} s
        </div>

        <svg viewBox="0 0 640 220" className="relative h-full w-full drop-shadow-md">
          <MotionTrail state={state} time={timeFrac} formulaId={formulaId} />
          <VelocityVector state={state} time={timeFrac} formulaId={formulaId} />
          <AccelerationVector state={state} time={timeFrac} formulaId={formulaId} />
          <ParticleObject state={state} time={timeFrac} duration={state.t} formulaId={formulaId} />
        </svg>
      </div>

      {/* Control Panel / Dynamic Sliders */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {/* Dynamically render sliders based on formulaId */}
        {["velocity"].includes(formulaId) && (
          <>
            <Slider label="Displacement (s)" value={params.s} min={0} max={100} step={1} onChange={(v) => updateParam("s", v)} unit="m" />
            <Slider label="Time (t)" value={params.t} min={1} max={20} step={0.5} onChange={(v) => updateParam("t", v)} unit="s" />
          </>
        )}
        
        {["acceleration"].includes(formulaId) && (
          <>
            <Slider label="Initial Vel (u)" value={params.u} min={0} max={50} step={1} onChange={(v) => updateParam("u", v)} unit="m/s" />
            <Slider label="Final Vel (v)" value={params.v} min={0} max={100} step={1} onChange={(v) => updateParam("v", v)} unit="m/s" />
            <Slider label="Time (t)" value={params.t} min={1} max={20} step={0.5} onChange={(v) => updateParam("t", v)} unit="s" />
          </>
        )}

        {["motion-1", "motion-3"].includes(formulaId) && (
          <>
            <Slider label="Initial Vel (u)" value={params.u} min={0} max={50} step={1} onChange={(v) => updateParam("u", v)} unit="m/s" />
            <Slider label="Acceleration (a)" value={params.a} min={-10} max={20} step={0.5} onChange={(v) => updateParam("a", v)} unit="m/s²" />
            <Slider label="Time (t)" value={params.t} min={1} max={20} step={0.5} onChange={(v) => updateParam("t", v)} unit="s" />
          </>
        )}

        {["motion-2"].includes(formulaId) && (
          <>
            <Slider label="Initial Vel (u)" value={params.u} min={0} max={50} step={1} onChange={(v) => updateParam("u", v)} unit="m/s" />
            <Slider label="Final Vel (v)" value={params.v} min={0} max={100} step={1} onChange={(v) => updateParam("v", v)} unit="m/s" />
            <Slider label="Time (t)" value={params.t} min={1} max={20} step={0.5} onChange={(v) => updateParam("t", v)} unit="s" />
          </>
        )}

        {["motion-4"].includes(formulaId) && (
          <>
            <Slider label="Initial Vel (u)" value={params.u} min={0} max={50} step={1} onChange={(v) => updateParam("u", v)} unit="m/s" />
            <Slider label="Acceleration (a)" value={params.a} min={-10} max={20} step={0.5} onChange={(v) => updateParam("a", v)} unit="m/s²" />
            <Slider label="Displacement (s)" value={params.s} min={0} max={200} step={1} onChange={(v) => updateParam("s", v)} unit="m" />
          </>
        )}
      </div>

      <div className="mt-4 flex items-center justify-end gap-3 border-t border-[#333] pt-4">
        <button
          onClick={isPlaying ? pauseAnimation : startAnimation}
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
        <KinematicsGraphs state={state} time={timeFrac} formulaId={formulaId} />
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
