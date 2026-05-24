import React, { useEffect, useState } from "react";
import type { PhysicsLabParams } from "../../sscPhysicsEngine";
import { calculateElectricity } from "../utils/calculateElectricity";
import { CircuitDiagram } from "../objects/CircuitDiagram";
import { FieldLines } from "../objects/FieldLines";
import { ElectricityGraphs } from "../graphs/ElectricityGraphs";
import { PlaybackControls } from "../../shared/playback/PlaybackControls";
import { GraphGrid } from "../../shared/graph/GraphGrid";

export function ElectricityScene({
  params,
  updateParam,
}: {
  params: PhysicsLabParams;
  updateParam: <Key extends keyof PhysicsLabParams>(key: Key, value: PhysicsLabParams[Key]) => void;
}) {
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const isField = ["coulombs-law", "electric-field"].includes(params.formulaId);
  const data = calculateElectricity(params);

  useEffect(() => {
    if (!isPlaying) return;
    
    let frameId: number;
    let lastTime = performance.now();
    
    const animate = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      
      setProgress((p) => {
        // Time progresses normally
        return p + delta;
      });
      frameId = requestAnimationFrame(animate);
    };
    
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying]);

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-md border border-[#20242b] bg-[#0d1117]">
        <svg viewBox="0 0 640 280" className="h-[280px] w-full">
          {/* We only show GraphGrid for field lines, circuit has its own background feel */}
          {isField && <GraphGrid />}
          
          {isField ? (
            <FieldLines params={params} force={data.force} eField={data.eField} />
          ) : (
            <CircuitDiagram params={params} progress={progress} current={data.current} resistance={data.resistance} />
          )}
        </svg>
      </div>

      <PlaybackControls 
        isPlaying={isPlaying}
        startAnimation={() => setIsPlaying(true)}
        pauseAnimation={() => setIsPlaying(false)}
        resetAnimation={() => setProgress(0)}
      />

      <ElectricityGraphs 
        params={params} 
        formulaId={params.formulaId} 
        current={data.current} 
        resistance={data.resistance} 
        power={data.power} 
        time={progress} 
      />
    </div>
  );
}
