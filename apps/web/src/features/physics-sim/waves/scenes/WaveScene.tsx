import React, { useEffect, useState } from "react";
import type { PhysicsLabParams } from "../../sscPhysicsEngine";
import { calculateWaveProperties, calculateEcho } from "../utils/calculateWaves";
import { SineWave } from "../objects/SineWave";
import { EchoSimulation } from "../objects/EchoSimulation";
import { WaveGraphs } from "../graphs/WaveGraphs";
import { PlaybackControls } from "../../shared/playback/PlaybackControls";
import { GraphGrid } from "../../shared/graph/GraphGrid";
import { usePhysicsEngine } from "../../shared/usePhysicsEngine";

const MemoizedWaveGraphs = React.memo(WaveGraphs);

export function WaveScene({
  params,
  updateParam,
}: {
  params: PhysicsLabParams;
  updateParam: <Key extends keyof PhysicsLabParams>(key: Key, value: PhysicsLabParams[Key]) => void;
}) {

  const sineRef = React.useRef<import("../objects/SineWave").SineWaveRef>(null);
  const echoRef = React.useRef<import("../objects/EchoSimulation").EchoSimulationRef>(null);

  const {
    isPlaying,
    uiTimeFrac,
    startAnimation,
    stopAnimation,
    resetAnimation,
  } = usePhysicsEngine({
    duration: 1, // continuous looping
    throttleMs: 100,
    onUpdate: (timeFrac) => {
      // Direct DOM updates at 60 FPS
      if (sineRef.current) sineRef.current.updateTimeFrac(timeFrac);
      if (echoRef.current) echoRef.current.updateTimeFrac(timeFrac);
    }
  });

  const echoData = calculateEcho(params);

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-md border border-[#20242b] bg-[#0d1117]">
        <svg viewBox="0 0 640 280" className="h-[280px] w-full">
          <GraphGrid />
          
          {params.formulaId === "echo-distance" ? (
            <EchoSimulation ref={echoRef} params={params} velocity={echoData.velocity} />
          ) : (
            <SineWave ref={sineRef} params={params} />
          )}
        </svg>
      </div>

      <PlaybackControls 
        isPlaying={isPlaying}
        startAnimation={startAnimation}
        pauseAnimation={stopAnimation}
        resetAnimation={resetAnimation}
      />

      <MemoizedWaveGraphs params={params} formulaId={params.formulaId} time={uiTimeFrac} />
    </div>
  );
}
