import { useEffect, useMemo, useState } from "react";
import katex from "katex";
import { Activity, Atom, Droplets, Gauge, RotateCcw, Waves, Zap } from "lucide-react";
import {
  calculateElectricity,
  calculateEnergy,
  calculateForceMotion,
  calculateGravitationalForce,
  calculatePressure,
  calculateProjectile,
  calculateWave,
  defaultPhysicsLabParams,
  formulaById,
  formulasForScenario,
  type FormulaDefinition,
  type PhysicsLabParams,
  type PhysicsLabScenario,
} from "./sscPhysicsEngine";

const scenarioOptions: { id: PhysicsLabScenario; label: string }[] = [
  { id: "projectile", label: "Projectile" },
  { id: "force", label: "Force" },
  { id: "energy", label: "Energy" },
  { id: "pressure", label: "Pressure" },
  { id: "waves", label: "Waves" },
  { id: "electricity", label: "Electricity" },
];

export function PhysicsEngineLab({ initialParams }: { initialParams?: Partial<PhysicsLabParams> }) {
  const [params, setParams] = useState<PhysicsLabParams>({ ...defaultPhysicsLabParams, ...initialParams });
  const [progress, setProgress] = useState(0);
  const selectedFormula = params.formulaId ? formulaById(params.formulaId) : undefined;
  const activeFormulas = selectedFormula ? [selectedFormula] : formulasForScenario(params.scenario);
  const isExactFormulaMode = Boolean(selectedFormula);

  useEffect(() => {
    let frameId = 0;
    const startedAt = performance.now();
    const duration = params.scenario === "electricity" ? 2200 : 1800;

    function animate(now: number) {
      const elapsed = (now - startedAt) / duration;
      setProgress(params.scenario === "electricity" ? elapsed % 1 : Math.min(1, elapsed));
      if (params.scenario === "electricity" || elapsed < 1) {
        frameId = requestAnimationFrame(animate);
      }
    }

    setProgress(0);
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [params]);

  function updateParam<Key extends keyof PhysicsLabParams>(key: Key, value: PhysicsLabParams[Key]) {
    setParams((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="mt-3 rounded-lg border border-[#1f1f1f] bg-[#101010] p-3 text-[#f5f5f5]">
      {!isExactFormulaMode ? (
        <div className="mb-3 flex gap-1 overflow-x-auto pb-1">
          {scenarioOptions.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              onClick={() => updateParam("scenario", scenario.id)}
              className={`shrink-0 rounded-md px-3 py-1.5 text-xs transition ${
                params.scenario === scenario.id
                  ? "bg-[#f5f5f5] text-[#0a0a0a]"
                  : "bg-[#171717] text-[#9ca3af] hover:bg-[#1f1f1f] hover:text-[#f5f5f5]"
              }`}
            >
              {scenario.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="overflow-hidden rounded-md border border-[#20242b] bg-[#0d1117]">
          <PhysicsScene params={params} progress={progress} />
        </div>

        <aside className="rounded-md border border-[#1f1f1f] bg-[#0d0d0d] p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-[#f5f5f5]">
            <ScenarioIcon scenario={params.scenario} />
            <span>{isExactFormulaMode ? "Selected formula" : "Live formula model"}</span>
          </div>
          <div className="mt-3 space-y-2">
            {activeFormulas.map((formula) => (
              <FormulaCard formula={formula} key={formula.id} />
            ))}
          </div>
        </aside>
      </div>

      <Controls params={params} onChange={updateParam} />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#9ca3af]">
        <Metrics params={params} />
        <button
          type="button"
          onClick={() => setProgress(0)}
          className="inline-flex items-center gap-1.5 text-[#9ca3af] transition hover:text-[#f5f5f5]"
        >
          <RotateCcw size={13} />
          Replay
        </button>
      </div>
    </div>
  );
}

function PhysicsScene({ params, progress }: { params: PhysicsLabParams; progress: number }) {
  if (params.formulaId === "gravitational-force") return <GravityScene params={params} />;
  if (params.formulaId === "momentum") return <MomentumScene params={params} progress={progress} />;
  if (params.formulaId === "frequency-period") return <PeriodScene params={params} progress={progress} />;
  if (params.formulaId === "echo-distance") return <EchoScene params={params} progress={progress} />;
  if (params.scenario === "force") return <ForceScene params={params} progress={progress} />;
  if (params.scenario === "energy") return <EnergyScene params={params} progress={progress} />;
  if (params.scenario === "pressure") return <PressureScene params={params} />;
  if (params.scenario === "waves") return <WaveScene params={params} progress={progress} />;
  if (params.scenario === "electricity") return <ElectricityScene params={params} progress={progress} />;
  return <ProjectileScene params={params} progress={progress} />;
}

function ProjectileScene({ params, progress }: { params: PhysicsLabParams; progress: number }) {
  const metrics = calculateProjectile(params);
  const points = useMemo(() => {
    return Array.from({ length: 90 }, (_, index) => {
      const t = (metrics.flightTime * index) / 89;
      return {
        x: metrics.vx * t,
        y: metrics.vy * t - 0.5 * params.gravity * t * t,
      };
    });
  }, [metrics.flightTime, metrics.vx, metrics.vy, params.gravity]);
  const maxX = Math.max(metrics.range, 1);
  const maxY = Math.max(metrics.maxHeight, 1);
  const mapped = points.map((point) => ({
    x: 44 + (point.x / maxX) * 548,
    y: 244 - (point.y / maxY) * 172,
  }));
  const current = mapped[Math.min(mapped.length - 1, Math.floor(progress * (mapped.length - 1)))] ?? mapped[0];
  const path = toPath(mapped.slice(0, Math.max(2, Math.floor(progress * mapped.length))));

  return (
    <svg viewBox="0 0 640 280" className="h-[280px] w-full">
      <GraphGrid />
      <line x1="44" x2="608" y1="244" y2="244" stroke="rgba(255,255,255,0.34)" strokeWidth="1.5" />
      <line x1="44" x2="44" y1="34" y2="244" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
      <line x1="32" x2="608" y1="244" y2="244" stroke="rgba(255,255,255,0.28)" strokeWidth="2" />
      <path d={path} fill="none" stroke="#ff3b30" strokeLinecap="round" strokeWidth="3" />
      <line x1="44" x2="110" y1="244" y2="194" stroke="#60a5fa" strokeLinecap="round" strokeWidth="4" />
      <circle cx={current.x} cy={current.y} r="7" fill="#f5f5f5" />
      <text x="44" y="34" className="fill-[#9ca3af] text-[11px]">
        Projectile path on coordinate axes
      </text>
    </svg>
  );
}

function ForceScene({ params, progress }: { params: PhysicsLabParams; progress: number }) {
  const metrics = calculateForceMotion(params);
  const blockX = 54 + Math.min(420, metrics.displacementAfter3s * 38 * progress);
  const forceLength = Math.min(130, params.force * 1.8);
  const frictionLength = Math.min(120, metrics.frictionForce * 1.5);

  return (
    <svg viewBox="0 0 640 280" className="h-[280px] w-full">
      <LabFloor />
      <line x1="28" x2="612" y1="214" y2="214" stroke="rgba(255,255,255,0.34)" strokeWidth="2" />
      <line x1="28" x2="612" y1="218" y2="218" stroke="rgba(255,59,48,0.28)" strokeDasharray="5 7" strokeWidth="2" />
      <rect x={blockX} y="148" width="92" height="66" rx="6" fill="#1f2937" stroke="#4b5563" strokeWidth="2" />
      <text x={blockX + 46} y="187" textAnchor="middle" className="fill-white text-[13px] font-semibold">
        {params.mass.toFixed(0)} kg
      </text>
      <Arrow x1={blockX + 92} y1={181} x2={blockX + 92 + forceLength} y2={181} color="#60a5fa" label={`F = ${params.force.toFixed(0)} N`} />
      <Arrow x1={blockX} y1={198} x2={blockX - frictionLength} y2={198} color="#ff3b30" label={`fr = ${metrics.frictionForce.toFixed(1)} N`} />
      <Arrow x1={blockX + 46} y1={148} x2={blockX + 46} y2={100} color="#22c55e" label="N" />
      <Arrow x1={blockX + 46} y1={214} x2={blockX + 46} y2={256} color="#f59e0b" label="mg" />
    </svg>
  );
}

function MomentumScene({ params, progress }: { params: PhysicsLabParams; progress: number }) {
  const x = 64 + progress * 430;
  const velocity = Math.max(1, params.speed / 8);
  const momentum = params.mass * velocity;

  return (
    <svg viewBox="0 0 640 280" className="h-[280px] w-full">
      <LabFloor />
      <line x1="36" x2="604" y1="214" y2="214" stroke="rgba(255,255,255,0.34)" strokeWidth="2" />
      <rect x={x} y="158" width="94" height="56" rx="8" fill="#1f2937" stroke="#4b5563" strokeWidth="2" />
      <circle cx={x + 22} cy="224" r="8" fill="#0d1117" stroke="#9ca3af" strokeWidth="2" />
      <circle cx={x + 72} cy="224" r="8" fill="#0d1117" stroke="#9ca3af" strokeWidth="2" />
      <Arrow x1={x + 94} y1={186} x2={x + 190} y2={186} color="#ff3b30" label={`p = ${momentum.toFixed(1)}`} />
      <text x="42" y="42" className="fill-[#9ca3af] text-[11px]">
        Momentum increases with mass and velocity
      </text>
    </svg>
  );
}

function GravityScene({ params }: { params: PhysicsLabParams }) {
  const metrics = calculateGravitationalForce(params);
  const leftRadius = Math.min(34, 12 + params.mass1 * 1.8);
  const rightRadius = Math.min(40, 12 + params.mass2 * 1.8);
  const distancePx = Math.min(360, 80 + params.distance * 40);
  const leftX = 320 - distancePx / 2;
  const rightX = 320 + distancePx / 2;

  return (
    <svg viewBox="0 0 640 280" className="h-[280px] w-full">
      <SpaceBackdrop />
      <line x1={leftX} x2={rightX} y1="140" y2="140" stroke="rgba(255,255,255,0.16)" strokeDasharray="5 7" />
      <circle cx={leftX} cy="140" r={leftRadius} fill="#9ca3af" />
      <circle cx={rightX} cy="140" r={rightRadius} fill="#f5f5f5" />
      <Arrow x1={leftX + leftRadius + 8} y1={140} x2={leftX + 92} y2={140} color="#ff3b30" label="attraction" />
      <Arrow x1={rightX - rightRadius - 8} y1={140} x2={rightX - 92} y2={140} color="#ff3b30" label="" />
      <text x="42" y="42" className="fill-[#9ca3af] text-[11px]">
        Gravitational force weakens as distance squared increases
      </text>
      <text x="42" y="62" className="fill-[#8b949e] text-[11px]">
        F = {metrics.force.toExponential(2)} N using G = {metrics.gravitationalConstant.toExponential(2)}
      </text>
    </svg>
  );
}

function EnergyScene({ params, progress }: { params: PhysicsLabParams; progress: number }) {
  const metrics = calculateEnergy(params);
  const ballY = 56 + progress * 158;
  const peRatio = 1 - progress;
  const keRatio = progress;

  return (
    <svg viewBox="0 0 640 280" className="h-[280px] w-full">
      <EnergyBackdrop />
      <line x1="58" y1="214" x2="382" y2="214" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
      <line x1="120" y1="56" x2="120" y2="214" stroke="rgba(255,255,255,0.16)" strokeDasharray="5 6" />
      <circle cx="120" cy={ballY} r="16" fill="#f5f5f5" />
      <rect x="456" y={214 - peRatio * 150} width="46" height={peRatio * 150} rx="4" fill="#60a5fa" />
      <rect x="526" y={214 - keRatio * 150} width="46" height={keRatio * 150} rx="4" fill="#ff3b30" />
      <text x="455" y="236" className="fill-[#9ca3af] text-[11px]">Ep</text>
      <text x="526" y="236" className="fill-[#9ca3af] text-[11px]">Ek</text>
      <text x="56" y="34" className="fill-[#9ca3af] text-[11px]">Potential energy transforms into kinetic energy</text>
      <text x="56" y="54" className="fill-[#8b949e] text-[11px]">
        Total mechanical energy: {metrics.potentialEnergy.toFixed(0)} J
      </text>
    </svg>
  );
}

function PressureScene({ params }: { params: PhysicsLabParams }) {
  const metrics = calculatePressure(params);
  const waterHeight = Math.min(170, 40 + params.depth * 24);
  const pressureNeedle = Math.min(130, metrics.liquidPressure / 400);

  return (
    <svg viewBox="0 0 640 280" className="h-[280px] w-full">
      <FluidBackdrop />
      <rect x="86" y="52" width="190" height="176" rx="8" fill="rgba(96,165,250,0.08)" stroke="rgba(255,255,255,0.24)" />
      <rect x="86" y={228 - waterHeight} width="190" height={waterHeight} rx="6" fill="rgba(96,165,250,0.48)" />
      <line x1="304" y1={228 - waterHeight} x2="304" y2="228" stroke="#60a5fa" strokeWidth="3" />
      <text x="318" y="150" className="fill-[#9ca3af] text-[12px]">h = {params.depth.toFixed(1)} m</text>
      <circle cx="486" cy="142" r="62" fill="#111827" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
      <line x1="486" y1="142" x2={486 + pressureNeedle} y2="142" stroke="#ff3b30" strokeLinecap="round" strokeWidth="4" transform="rotate(-35 486 142)" />
      <text x="442" y="220" className="fill-[#9ca3af] text-[12px]">P = h rho g</text>
    </svg>
  );
}

function WaveScene({ params, progress }: { params: PhysicsLabParams; progress: number }) {
  const metrics = calculateWave(params);
  const phaseShift = progress * Math.PI * 2;
  const points = Array.from({ length: 150 }, (_, index) => {
    const x = 36 + (index / 149) * 568;
    const normalizedX = index / 149;
    const cycles = 7 / params.wavelength;
    const y = 140 + Math.sin(normalizedX * Math.PI * 2 * cycles - phaseShift) * params.amplitude * 42;
    return { x, y };
  });
  const path = toPath(points);
  const particlePoints = Array.from({ length: 8 }, (_, index) => {
    const x = 72 + index * 68;
    const normalizedX = (x - 36) / 568;
    const cycles = 7 / params.wavelength;
    const y = 140 + Math.sin(normalizedX * Math.PI * 2 * cycles - phaseShift) * params.amplitude * 42;
    return { x, y };
  });

  return (
    <svg viewBox="0 0 640 280" className="h-[280px] w-full">
      <WaveBackdrop />
      <line x1="34" x2="606" y1="140" y2="140" stroke="rgba(255,255,255,0.18)" strokeDasharray="5 7" />
      <path d={path} fill="none" stroke="#ff3b30" strokeLinecap="round" strokeWidth="3" />
      {particlePoints.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r="4.5" fill="#f5f5f5" opacity="0.92" />
      ))}
      <line x1="86" x2={86 + params.wavelength * 44} y1="228" y2="228" stroke="#60a5fa" strokeWidth="2" />
      <line x1="86" x2="86" y1="222" y2="234" stroke="#60a5fa" strokeWidth="2" />
      <line x1={86 + params.wavelength * 44} x2={86 + params.wavelength * 44} y1="222" y2="234" stroke="#60a5fa" strokeWidth="2" />
      <text x="86" y="250" className="fill-[#9ca3af] text-[11px]">
        wavelength = {params.wavelength.toFixed(1)} m, velocity = {metrics.velocity.toFixed(1)} m/s
      </text>
    </svg>
  );
}

function PeriodScene({ params, progress }: { params: PhysicsLabParams; progress: number }) {
  const metrics = calculateWave(params);
  const angle = progress * Math.PI * 2;
  const handX = 320 + Math.cos(angle - Math.PI / 2) * 74;
  const handY = 140 + Math.sin(angle - Math.PI / 2) * 74;

  return (
    <svg viewBox="0 0 640 280" className="h-[280px] w-full">
      <WaveBackdrop />
      <circle cx="320" cy="140" r="86" fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.22)" strokeWidth="2" />
      <circle cx="320" cy="140" r="5" fill="#f5f5f5" />
      <line x1="320" y1="140" x2={handX} y2={handY} stroke="#ff3b30" strokeLinecap="round" strokeWidth="4" />
      <path d="M320 54 A86 86 0 1 1 319.9 54" fill="none" stroke="rgba(96,165,250,0.18)" strokeWidth="8" />
      <text x="232" y="246" className="fill-[#9ca3af] text-[12px]">
        One complete cycle takes T = {metrics.period.toFixed(2)} s
      </text>
    </svg>
  );
}

function EchoScene({ params, progress }: { params: PhysicsLabParams; progress: number }) {
  const metrics = calculateWave(params);
  const wallX = 520;
  const sourceX = 96;
  const outbound = progress < 0.5;
  const waveX = outbound
    ? sourceX + (wallX - sourceX) * progress * 2
    : wallX - (wallX - sourceX) * (progress - 0.5) * 2;

  return (
    <svg viewBox="0 0 640 280" className="h-[280px] w-full">
      <WaveBackdrop />
      <rect x={wallX} y="54" width="18" height="174" rx="3" fill="#2a2f38" stroke="rgba(255,255,255,0.22)" />
      <circle cx={sourceX} cy="140" r="16" fill="#f5f5f5" />
      <circle cx={waveX} cy="140" r="22" fill="none" stroke="#ff3b30" strokeWidth="3" opacity="0.95" />
      <circle cx={waveX} cy="140" r="42" fill="none" stroke="rgba(255,59,48,0.3)" strokeWidth="2" />
      <line x1={sourceX} y1="214" x2={wallX} y2="214" stroke="#60a5fa" strokeWidth="2" />
      <text x="214" y="238" className="fill-[#9ca3af] text-[11px]">
        echo distance example: {metrics.echoDistanceAfterTwoSeconds.toFixed(1)} m for 2 s round trip
      </text>
    </svg>
  );
}

function ElectricityScene({ params, progress }: { params: PhysicsLabParams; progress: number }) {
  const metrics = calculateElectricity(params);
  const dotPositions = [0, 0.25, 0.5, 0.75].map((offset) => (progress + offset) % 1);

  return (
    <svg viewBox="0 0 640 280" className="h-[280px] w-full">
      <CircuitBackdrop />
      <path d="M130 78 H510 V214 H130 Z" fill="none" stroke="rgba(255,255,255,0.34)" strokeWidth="4" />
      <line x1="130" x2="130" y1="116" y2="176" stroke="#f5f5f5" strokeWidth="5" />
      <line x1="154" x2="154" y1="132" y2="160" stroke="#f5f5f5" strokeWidth="3" />
      <rect x="452" y="120" width="64" height="52" rx="6" fill="#1f2937" stroke="#ff3b30" strokeWidth="2" />
      <text x="464" y="150" className="fill-white text-[12px]">R</text>
      {dotPositions.map((position, index) => {
        const point = circuitPoint(position);
        return <circle key={index} cx={point.x} cy={point.y} r="5" fill="#ff3b30" />;
      })}
      <text x="114" y="58" className="fill-[#9ca3af] text-[11px]">
        V = IR, I = {metrics.current.toFixed(2)} A
      </text>
    </svg>
  );
}

function Controls({
  params,
  onChange,
}: {
  params: PhysicsLabParams;
  onChange: <Key extends keyof PhysicsLabParams>(key: Key, value: PhysicsLabParams[Key]) => void;
}) {
  const controls = controlsForFormula(params.scenario, params.formulaId);

  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-3">
      {controls.map((control) => (
        <Slider
          key={control.key}
          label={control.label}
          max={control.max}
          min={control.min}
          step={control.step}
          unit={control.unit}
          value={Number(params[control.key].toFixed(2))}
          onChange={(value) => onChange(control.key, value)}
        />
      ))}
    </div>
  );
}

function Metrics({ params }: { params: PhysicsLabParams }) {
  if (params.scenario === "force") {
    if (params.formulaId === "gravitational-force") {
      const values = calculateGravitationalForce(params);
      return <MetricLine items={[`F ${values.force.toExponential(2)} N`, `m1 ${params.mass1.toFixed(1)} kg`, `r ${params.distance.toFixed(1)} m`]} />;
    }
    if (params.formulaId === "momentum") {
      const velocity = Math.max(1, params.speed / 8);
      return <MetricLine items={[`p ${(params.mass * velocity).toFixed(1)} kg m/s`, `m ${params.mass.toFixed(1)} kg`, `v ${velocity.toFixed(1)} m/s`]} />;
    }
    const values = calculateForceMotion(params);
    return (
      <MetricLine
        items={[
          `a ${values.acceleration.toFixed(2)} m/s2`,
          `net F ${values.netForce.toFixed(1)} N`,
          `p ${values.momentumAfter3s.toFixed(1)} kg m/s`,
        ]}
      />
    );
  }
  if (params.scenario === "energy") {
    const values = calculateEnergy(params);
    return <MetricLine items={[`Ep ${values.potentialEnergy.toFixed(0)} J`, `v ${values.impactVelocity.toFixed(1)} m/s`, `P ${values.powerIfReleasedIn3s.toFixed(0)} W`]} />;
  }
  if (params.scenario === "pressure") {
    const values = calculatePressure(params);
    return <MetricLine items={[`P liquid ${values.liquidPressure.toFixed(0)} Pa`, `P applied ${values.appliedPressure.toFixed(1)} Pa`]} />;
  }
  if (params.scenario === "waves") {
    const values = calculateWave(params);
    return <MetricLine items={[`v ${values.velocity.toFixed(1)} m/s`, `T ${values.period.toFixed(2)} s`, `echo d ${values.echoDistanceAfterTwoSeconds.toFixed(1)} m`]} />;
  }
  if (params.scenario === "electricity") {
    const values = calculateElectricity(params);
    return <MetricLine items={[`I ${values.current.toFixed(2)} A`, `P ${values.power.toFixed(1)} W`, `W 60s ${values.energyInOneMinute.toFixed(0)} J`]} />;
  }
  const values = calculateProjectile(params);
  return <MetricLine items={[`range ${values.range.toFixed(1)} m`, `height ${values.maxHeight.toFixed(1)} m`, `time ${values.flightTime.toFixed(1)} s`]} />;
}

function MetricLine({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
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
    <label className="block rounded-md border border-[#1f1f1f] bg-[#0d0d0d] p-3">
      <span className="flex items-center justify-between gap-3 text-xs text-[#9ca3af]">
        <span>{label}</span>
        <span className="flex items-center gap-1">
          <input
            className="h-7 w-16 rounded border border-[#2a2a2a] bg-[#151515] px-1.5 text-right text-xs text-[#f5f5f5] outline-none transition focus:border-[#6b7280]"
            max={max}
            min={min}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              if (!Number.isNaN(nextValue)) onChange(Math.max(min, Math.min(max, nextValue)));
            }}
            step={step}
            type="number"
            value={value}
          />
          <span className="min-w-8 text-[11px] text-[#6b7280]">{unit}</span>
        </span>
      </span>
      <input
        className="mt-3 w-full accent-[#ff3b30]"
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

function controlsForFormula(scenario: PhysicsLabScenario, formulaId = "") {
  if (formulaId === "gravitational-force") {
    return [
      { key: "mass1" as const, label: "Mass 1", min: 1, max: 20, step: 0.5, unit: "kg" },
      { key: "mass2" as const, label: "Mass 2", min: 1, max: 20, step: 0.5, unit: "kg" },
      { key: "distance" as const, label: "Distance", min: 1, max: 8, step: 0.1, unit: "m" },
    ];
  }
  if (formulaId === "momentum") {
    return [
      { key: "mass" as const, label: "Mass", min: 1, max: 40, step: 1, unit: "kg" },
      { key: "speed" as const, label: "Velocity", min: 8, max: 80, step: 1, unit: "m/s" },
      { key: "friction" as const, label: "Track drag", min: 0, max: 0.8, step: 0.01, unit: "" },
    ];
  }
  if (scenario === "force") {
    return [
      { key: "force" as const, label: "Force", min: 0, max: 120, step: 1, unit: "N" },
      { key: "mass" as const, label: "Mass", min: 2, max: 40, step: 1, unit: "kg" },
      { key: "friction" as const, label: "Friction", min: 0, max: 0.8, step: 0.01, unit: "mu" },
    ];
  }
  if (scenario === "energy") {
    return [
      { key: "height" as const, label: "Height", min: 1, max: 40, step: 1, unit: "m" },
      { key: "mass" as const, label: "Mass", min: 1, max: 30, step: 1, unit: "kg" },
      { key: "gravity" as const, label: "Gravity", min: 4, max: 14, step: 0.1, unit: "m/s2" },
    ];
  }
  if (scenario === "pressure") {
    return [
      { key: "depth" as const, label: "Depth", min: 0.5, max: 7, step: 0.1, unit: "m" },
      { key: "density" as const, label: "Density", min: 600, max: 1400, step: 10, unit: "kg/m3" },
      { key: "area" as const, label: "Area", min: 0.1, max: 2, step: 0.1, unit: "m2" },
    ];
  }
  if (scenario === "electricity") {
    return [
      { key: "voltage" as const, label: "Voltage", min: 1, max: 24, step: 1, unit: "V" },
      { key: "resistance" as const, label: "Resistance", min: 1, max: 30, step: 1, unit: "ohm" },
      { key: "mass" as const, label: "Animation load", min: 1, max: 20, step: 1, unit: "" },
    ];
  }
  if (scenario === "waves") {
    return [
      { key: "frequency" as const, label: "Frequency", min: 0.5, max: 12, step: 0.1, unit: "Hz" },
      { key: "wavelength" as const, label: "Wavelength", min: 0.8, max: 6, step: 0.1, unit: "m" },
      { key: "amplitude" as const, label: "Amplitude", min: 0.3, max: 2, step: 0.1, unit: "m" },
    ];
  }
  return [
    { key: "speed" as const, label: "Speed", min: 8, max: 55, step: 1, unit: "m/s" },
    { key: "angleDegrees" as const, label: "Angle", min: 10, max: 80, step: 1, unit: "deg" },
    { key: "gravity" as const, label: "Gravity", min: 4, max: 14, step: 0.1, unit: "m/s2" },
  ];
}

function FormulaCard({ formula }: { formula: FormulaDefinition }) {
  const rendered = katex.renderToString(formula.latex, {
    displayMode: true,
    throwOnError: false,
  });

  return (
    <div className="rounded-md bg-[#151515] p-3">
      <p className="text-[11px] text-[#9ca3af]">{formula.title}</p>
      <div
        className="physics-formula mt-1 overflow-x-auto text-[#f5f5f5]"
        dangerouslySetInnerHTML={{ __html: rendered }}
      />
      <p className="mt-2 text-[11px] leading-4 text-[#8b949e]">{formula.variables}</p>
    </div>
  );
}

function GraphGrid() {
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

function LabFloor() {
  return (
    <g>
      <rect width="640" height="280" fill="#0d1117" />
      <rect x="0" y="214" width="640" height="66" fill="#101318" />
      {Array.from({ length: 18 }, (_, index) => (
        <line key={index} x1={index * 40} x2={index * 40 + 40} y1="244" y2="214" stroke="rgba(255,255,255,0.05)" />
      ))}
      <line x1="0" x2="640" y1="214" y2="214" stroke="rgba(255,255,255,0.13)" />
    </g>
  );
}

function EnergyBackdrop() {
  return (
    <g>
      <rect width="640" height="280" fill="#0d1117" />
      <rect x="40" y="214" width="360" height="36" fill="#11151b" />
      <rect x="86" y="56" width="70" height="158" fill="rgba(255,255,255,0.035)" />
      {Array.from({ length: 6 }, (_, index) => (
        <line key={index} x1="86" x2="156" y1={82 + index * 24} y2={82 + index * 24} stroke="rgba(255,255,255,0.08)" />
      ))}
    </g>
  );
}

function FluidBackdrop() {
  return (
    <g>
      <rect width="640" height="280" fill="#0b1218" />
      {Array.from({ length: 7 }, (_, index) => (
        <path
          key={index}
          d={`M0 ${52 + index * 32} C90 ${38 + index * 32}, 150 ${68 + index * 32}, 240 ${52 + index * 32} S410 ${38 + index * 32}, 640 ${54 + index * 32}`}
          fill="none"
          stroke="rgba(96,165,250,0.08)"
          strokeWidth="1"
        />
      ))}
    </g>
  );
}

function CircuitBackdrop() {
  return (
    <g>
      <rect width="640" height="280" fill="#0d1117" />
      <circle cx="512" cy="78" r="72" fill="rgba(255,59,48,0.035)" />
      <circle cx="130" cy="214" r="88" fill="rgba(96,165,250,0.035)" />
    </g>
  );
}

function WaveBackdrop() {
  return (
    <g>
      <rect width="640" height="280" fill="#0d1117" />
      {Array.from({ length: 8 }, (_, index) => (
        <path
          key={index}
          d={`M0 ${44 + index * 28} C80 ${28 + index * 28}, 160 ${60 + index * 28}, 240 ${44 + index * 28} S420 ${28 + index * 28}, 640 ${46 + index * 28}`}
          fill="none"
          stroke="rgba(96,165,250,0.055)"
          strokeWidth="1"
        />
      ))}
      <rect x="34" y="52" width="572" height="176" rx="8" fill="rgba(255,255,255,0.018)" stroke="rgba(255,255,255,0.08)" />
    </g>
  );
}

function SpaceBackdrop() {
  return (
    <g>
      <rect width="640" height="280" fill="#080b10" />
      {Array.from({ length: 36 }, (_, index) => (
        <circle
          key={index}
          cx={(index * 97) % 640}
          cy={(index * 53) % 280}
          r={index % 5 === 0 ? 1.4 : 0.8}
          fill="rgba(255,255,255,0.35)"
        />
      ))}
      <circle cx="320" cy="140" r="116" fill="none" stroke="rgba(96,165,250,0.06)" strokeWidth="2" />
      <circle cx="320" cy="140" r="72" fill="none" stroke="rgba(255,59,48,0.045)" strokeWidth="2" />
    </g>
  );
}

function Arrow({ color, label, x1, x2, y1, y2 }: { color: string; label: string; x1: number; x2: number; y1: number; y2: number }) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headX = x2 - Math.cos(angle) * 10;
  const headY = y2 - Math.sin(angle) * 10;

  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeLinecap="round" strokeWidth="3" />
      <path d={`M${x2} ${y2} L${headX - Math.sin(angle) * 5} ${headY + Math.cos(angle) * 5} L${headX + Math.sin(angle) * 5} ${headY - Math.cos(angle) * 5} Z`} fill={color} />
      <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 9} textAnchor="middle" className="fill-[#d1d5db] text-[10px]">
        {label}
      </text>
    </g>
  );
}

function ScenarioIcon({ scenario }: { scenario: PhysicsLabScenario }) {
  if (scenario === "force") return <Atom size={14} />;
  if (scenario === "energy") return <Gauge size={14} />;
  if (scenario === "pressure") return <Droplets size={14} />;
  if (scenario === "waves") return <Waves size={14} />;
  if (scenario === "electricity") return <Zap size={14} />;
  return <Activity size={14} />;
}

function toPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  return rest.reduce((path, point) => `${path} L${point.x.toFixed(2)} ${point.y.toFixed(2)}`, `M${first.x.toFixed(2)} ${first.y.toFixed(2)}`);
}

function circuitPoint(progress: number) {
  if (progress < 0.25) return { x: 130 + progress * 4 * 380, y: 78 };
  if (progress < 0.5) return { x: 510, y: 78 + (progress - 0.25) * 4 * 136 };
  if (progress < 0.75) return { x: 510 - (progress - 0.5) * 4 * 380, y: 214 };
  return { x: 130, y: 214 - (progress - 0.75) * 4 * 136 };
}
