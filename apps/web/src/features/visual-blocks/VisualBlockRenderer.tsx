import { lazy, Suspense } from "react";
import { ProgressiveReveal } from "./ProgressiveReveal";
import type { LearningVisualBlock } from "./visualBlockTypes";

const FunctionGraph = lazy(() =>
  import("../math-visualizer/FunctionGraph").then((module) => ({
    default: module.FunctionGraph,
  })),
);

const ProjectileSimulation = lazy(() =>
  import("../physics-sim/ProjectileSimulation").then((module) => ({
    default: module.ProjectileSimulation,
  })),
);

const PhysicsEngineLab = lazy(() =>
  import("../physics-sim/PhysicsEngineLab").then((module) => ({
    default: module.PhysicsEngineLab,
  })),
);

const QuadraticGraph = lazy(() =>
  import("../math-visualizer/QuadraticGraph").then((module) => ({
    default: module.QuadraticGraph,
  })),
);

export function VisualBlockRenderer({ block }: { block: LearningVisualBlock }) {
  return (
    <ProgressiveReveal>
      {(phase) => (
        <Suspense fallback={<VisualBlockLoading />}>
          {block.type === "physics.projectile" ? (
            <ProjectileSimulation initialParams={block.params} phase={phase} />
          ) : block.type === "physics.engineLab" ? (
            <PhysicsEngineLab initialParams={block.params} phase={phase} />
          ) : block.type === "math.quadraticGraph" ? (
            <QuadraticGraph initialParams={block.params} phase={phase} />
          ) : block.type === "math.sineGraph" ? (
            <FunctionGraph initialParams={block.params} phase={phase} />
          ) : null}
        </Suspense>
      )}
    </ProgressiveReveal>
  );
}

function VisualBlockLoading() {
  return (
    <div className="mt-3 rounded-lg bg-[#111111] px-4 py-3 text-sm text-[#9ca3af]">
      Preparing visual block...
    </div>
  );
}
