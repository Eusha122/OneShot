import React from "react";
import type { PhysicsLabParams } from "../../sscPhysicsEngine";

export function OpticsGraphs({
  params,
  formulaId,
}: {
  params: PhysicsLabParams;
  formulaId: string;
}) {
  const isRefraction = formulaId === "refractive-index" || formulaId === "critical-angle";

  if (isRefraction) {
    const validCritical = params.refractiveIndex > params.refractiveIndex2;
    const ratio = params.refractiveIndex2 / params.refractiveIndex;
    const criticalAngle = validCritical && ratio <= 1
      ? Math.asin(ratio) * (180 / Math.PI)
      : null;

    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-[#222] bg-[#111] p-4">
          <h3 className="mb-4 text-xs font-medium text-gray-400">Refractive Index Ratio</h3>
          <div className="flex h-32 flex-col justify-center items-center gap-4">
            <div className="w-full">
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-gray-400">Medium 1 (n₁)</span>
                <span className="text-white">{params.refractiveIndex.toFixed(2)}</span>
              </div>
              <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500" style={{ width: `${(params.refractiveIndex / 3) * 100}%` }} />
              </div>
            </div>
            <div className="w-full">
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-gray-400">Medium 2 (n₂)</span>
                <span className="text-white">{params.refractiveIndex2.toFixed(2)}</span>
              </div>
              <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${(params.refractiveIndex2 / 3) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-[#222] bg-[#111] p-4">
          <h3 className="mb-4 text-xs font-medium text-gray-400">Critical Angle</h3>
          <div className="flex h-32 items-center justify-center">
            {validCritical ? (
              <div className="text-center">
                <div className="text-4xl font-mono text-emerald-400">{criticalAngle !== null ? criticalAngle.toFixed(1) : "—"}°</div>
                <div className="text-xs text-gray-500 mt-2">Maximum angle before TIR</div>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <div>No critical angle</div>
                <div className="text-xs mt-1">Requires n₁ &gt; n₂</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Lens/Mirror Graph
  return (
    <div className="grid gap-4 md:grid-cols-1">
      <div className="rounded-lg border border-[#222] bg-[#111] p-4">
        <h3 className="mb-4 text-xs font-medium text-gray-400">Focal Length (f) = R / 2</h3>
        <div className="flex h-32 items-center justify-center">
          <div className="text-center">
            <div className="text-2xl text-white">f = {params.focalLength.toFixed(1)} cm</div>
            <div className="text-sm text-gray-500 mt-2">Radius of Curvature (R) = {(params.focalLength * 2).toFixed(1)} cm</div>
            <div className="text-sm text-emerald-500 mt-2">Power (P) = {(100 / params.focalLength).toFixed(2)} D</div>
          </div>
        </div>
      </div>
    </div>
  );
}
