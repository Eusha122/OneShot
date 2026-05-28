import { Suspense } from "react";
import { ProgressiveReveal } from "./ProgressiveReveal";
import type { LearningVisualBlock } from "./visualBlockTypes";
import { VISUAL_BLOCKS } from "./registry";
import { UnknownVisualization } from "./UnknownVisualization";
import { VisualBlockErrorBoundary } from "./VisualBlockErrorBoundary";

export function VisualBlockRenderer({ block }: { block: LearningVisualBlock }) {
  // Try to resolve the component from the registry
  const Component = VISUAL_BLOCKS[block.type as keyof typeof VISUAL_BLOCKS];

  if (!Component) {
    console.warn(`[VisualBlockRenderer] No component found for type: ${block.type}`);
    return <UnknownVisualization type={block.type} />;
  }

  // Handle special case for physics.forceMotion which reuses PhysicsEngineLab
  const renderParams = block.type === "physics.forceMotion" 
    ? { ...block.params, scenario: "force" } 
    : block.params;

  return (
    <VisualBlockErrorBoundary fallbackMessage={`Failed to render "${block.type}" block.`}>
      <ProgressiveReveal>
        {(phase) => (
          <Suspense fallback={<VisualBlockLoading />}>
            <Component initialParams={renderParams as any} phase={phase} />
          </Suspense>
        )}
      </ProgressiveReveal>
    </VisualBlockErrorBoundary>
  );
}

function VisualBlockLoading() {
  return (
    <div className="mt-3 flex h-52 w-full animate-pulse items-center justify-center rounded-lg bg-[#111111]">
      <div className="h-6 w-6 rounded-full border-2 border-[#333] border-t-[#f5f5f5] animate-spin" />
    </div>
  );
}
