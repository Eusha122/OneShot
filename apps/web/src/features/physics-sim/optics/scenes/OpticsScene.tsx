import React from "react";
import type { PhysicsLabParams } from "../../sscPhysicsEngine";
import { calculateMirrorLens, calculateRefraction } from "../utils/calculateOptics";
import { RayDiagram } from "../objects/RayDiagram";
import { RefractionBoundary } from "../objects/RefractionBoundary";
import { OpticsGraphs } from "../graphs/OpticsGraphs";
import { GraphGrid } from "../../shared/graph/GraphGrid";

export function OpticsScene({
  params,
  updateParam,
}: {
  params: PhysicsLabParams;
  updateParam: <Key extends keyof PhysicsLabParams>(key: Key, value: PhysicsLabParams[Key]) => void;
}) {
  const isRefraction = params.formulaId === "refractive-index" || params.formulaId === "critical-angle";

  const lensData = !isRefraction ? calculateMirrorLens(params) : null;
  const refData = isRefraction ? calculateRefraction(params) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-md border border-[#20242b] bg-[#0d1117]">
        <svg viewBox="0 0 640 280" className="h-[280px] w-full">
          <GraphGrid />
          
          {isRefraction && refData ? (
            <RefractionBoundary 
              params={params} 
              angleOfRefractionDeg={refData.angleOfRefractionDeg} 
              isTotalInternalReflection={refData.isTotalInternalReflection} 
            />
          ) : lensData ? (
            <RayDiagram 
              params={params} 
              v={lensData.v} 
              magnification={lensData.magnification} 
            />
          ) : null}
        </svg>
      </div>

      <div className="mt-2 text-sm text-gray-400 italic">
        * Visualizations are scaled representations for educational purposes.
      </div>

      <OpticsGraphs params={params} formulaId={params.formulaId} />
    </div>
  );
}
