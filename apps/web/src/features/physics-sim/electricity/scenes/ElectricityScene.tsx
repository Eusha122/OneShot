import React, { useEffect, useState } from "react";
import type { PhysicsLabParams } from "../../sscPhysicsEngine";
import { calculateElectricity } from "../utils/calculateElectricity";
import { CircuitDiagram } from "../objects/CircuitDiagram";
import { FieldLines } from "../objects/FieldLines";
import { ElectricityGraphs } from "../graphs/ElectricityGraphs";
import { PlaybackControls } from "../../shared/playback/PlaybackControls";
import { GraphGrid } from "../../shared/graph/GraphGrid";
import { usePhysicsEngine } from "../../shared/usePhysicsEngine";

const MemoizedElectricityGraphs = React.memo(ElectricityGraphs);

export function ElectricityScene({
  params,
  updateParam,
}: {
  params: PhysicsLabParams;
  updateParam: <Key extends keyof PhysicsLabParams>(key: Key, value: PhysicsLabParams[Key]) => void;
}) {
  const isField = ["coulombs-law", "electric-field"].includes(params.formulaId);
  const data = calculateElectricity(params);
  
  const circuitRef = React.useRef<import("../objects/CircuitDiagram").CircuitDiagramRef>(null);

  const {
    isPlaying,
    uiTimeFrac,
    startAnimation,
    stopAnimation,
    resetAnimation,
  } = usePhysicsEngine({
    duration: 1, // Doesn't matter, we loop continuously
    throttleMs: 100, // Update heavy UI at ~10 FPS
    onUpdate: (timeFrac) => {
      // Direct DOM updates at 60 FPS
      if (circuitRef.current) circuitRef.current.updateTimeFrac(timeFrac);
    }
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-md border border-[#20242b] bg-[#0d1117]">
        <svg viewBox="0 0 640 280" className="h-[280px] w-full">
          {/* We only show GraphGrid for field lines, circuit has its own background feel */}
          {isField && <GraphGrid />}
          
          {isField ? (
            <FieldLines params={params} force={data.force} eField={data.eField} />
          ) : (
            <CircuitDiagram ref={circuitRef} params={params} current={data.current} resistance={data.resistance} />
          )}
        </svg>
      </div>

      <PlaybackControls 
        isPlaying={isPlaying}
        startAnimation={startAnimation}
        pauseAnimation={stopAnimation}
        resetAnimation={resetAnimation}
      />

      <MemoizedElectricityGraphs 
        params={params} 
        formulaId={params.formulaId} 
        current={data.current} 
        resistance={data.resistance} 
        power={data.power} 
        time={uiTimeFrac} 
      />
    </div>
  );
}
