import { useEffect, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  calculateProjectileSimulation,
  pointAtProgress,
  type ProjectileParams,
  type ProjectilePoint,
} from "./projectileEngine";

const viewport = {
  width: 640,
  height: 260,
  paddingX: 32,
  groundY: 218,
};

const defaultParams: ProjectileParams = {
  speed: 32,
  angleDegrees: 42,
  gravity: 9.8,
};

export function ProjectileSimulation({ initialParams = defaultParams }: { initialParams?: ProjectileParams }) {
  const [params, setParams] = useState(initialParams);
  const [progress, setProgress] = useState(1);
  const [replayId, setReplayId] = useState(0);
  const simulation = useMemo(() => calculateProjectileSimulation(params), [params]);
  const mappedPoints = useMemo(() => mapTrajectoryToViewport(simulation.points), [simulation.points]);
  const currentPoint = pointAtProgress(mappedPoints, progress);
  const visiblePath = buildPath(mappedPoints.slice(0, Math.max(2, Math.ceil(mappedPoints.length * progress))));

  useEffect(() => {
    let frameId = 0;
    const durationMs = 1400;
    const startedAt = performance.now();

    function animate(now: number) {
      const nextProgress = Math.min(1, (now - startedAt) / durationMs);
      setProgress(nextProgress);
      if (nextProgress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    }

    setProgress(0);
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [replayId, params]);

  return (
    <div className="mt-3 rounded-lg bg-[#111111] p-3">
      <div className="relative h-52 overflow-hidden rounded-md bg-[#0d0d0d]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.07)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <svg viewBox={`0 0 ${viewport.width} ${viewport.height}`} className="relative h-full w-full">
          <path d={`M${viewport.paddingX} ${viewport.groundY} L608 ${viewport.groundY}`} stroke="rgba(156, 163, 175, 0.34)" strokeWidth="2" />
          <path d={visiblePath} fill="none" stroke="rgba(229, 231, 235, 0.92)" strokeLinecap="round" strokeWidth="3" />
          <path
            d={`M${viewport.paddingX + 34} ${viewport.groundY - 22} L${viewport.paddingX + 76} ${viewport.groundY - 56}`}
            stroke="rgba(156, 163, 175, 0.88)"
            strokeLinecap="round"
            strokeWidth="4"
          />
          <circle cx={currentPoint.x} cy={currentPoint.y} r="6" fill="#e5e7eb" />
        </svg>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Slider
          label="Speed"
          max={50}
          min={16}
          step={1}
          value={params.speed}
          unit="m/s"
          onChange={(speed) => setParams((current) => ({ ...current, speed }))}
        />
        <Slider
          label="Angle"
          max={75}
          min={20}
          step={1}
          value={params.angleDegrees}
          unit="deg"
          onChange={(angleDegrees) => setParams((current) => ({ ...current, angleDegrees }))}
        />
        <Slider
          label="Gravity"
          max={14}
          min={4}
          step={0.1}
          value={params.gravity}
          unit="m/s2"
          onChange={(gravity) => setParams((current) => ({ ...current, gravity }))}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#9ca3af]">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span>Range {simulation.metrics.range.toFixed(1)} m</span>
          <span>Height {simulation.metrics.maxHeight.toFixed(1)} m</span>
          <span>Time {simulation.metrics.flightTime.toFixed(1)} s</span>
        </div>
        <button
          type="button"
          aria-label="Replay projectile motion"
          onClick={() => setReplayId((value) => value + 1)}
          className="inline-flex items-center gap-1.5 text-[#9ca3af] transition hover:text-[#f5f5f5]"
        >
          <RotateCcw size={13} />
          Replay
        </button>
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
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  unit: string;
  value: number;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-xs text-[#9ca3af]">
        <span>{label}</span>
        <span>
          {Number.isInteger(value) ? value : value.toFixed(1)} {unit}
        </span>
      </span>
      <input
        className="mt-2 w-full accent-[#f5f5f5]"
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="range"
        value={value}
      />
    </label>
  );
}

function mapTrajectoryToViewport(points: ProjectilePoint[]): ProjectilePoint[] {
  const maxX = Math.max(...points.map((point) => point.x), 1);
  const maxY = Math.max(...points.map((point) => point.y), 1);
  const drawableWidth = viewport.width - viewport.paddingX * 2;
  const drawableHeight = viewport.groundY - 34;

  return points.map((point) => ({
    ...point,
    x: viewport.paddingX + (point.x / maxX) * drawableWidth,
    y: viewport.groundY - (point.y / maxY) * drawableHeight,
  }));
}

function buildPath(points: ProjectilePoint[]) {
  if (points.length === 0) return "";
  const [firstPoint, ...remainingPoints] = points;
  return remainingPoints.reduce(
    (path, point) => `${path} L${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
    `M${firstPoint.x.toFixed(2)} ${firstPoint.y.toFixed(2)}`,
  );
}
