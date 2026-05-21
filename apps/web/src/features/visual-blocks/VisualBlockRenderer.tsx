import { lazy, Suspense } from "react";
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

export function VisualBlockRenderer({ block }: { block: LearningVisualBlock }) {
  return (
    <Suspense fallback={<VisualBlockLoading />}>
      {block.type === "physics.projectile" ? (
        <ProjectileSimulation initialParams={block.params} />
      ) : (
        <FunctionGraph initialParams={block.params} />
      )}
    </Suspense>
  );
}

function VisualBlockLoading() {
  return (
    <div className="mt-3 rounded-lg bg-[#111111] px-4 py-3 text-sm text-[#9ca3af]">
      Preparing visual block...
    </div>
  );
}
