import React, { useEffect, useState } from "react";
import type { PhysicsLabParams } from "../../sscPhysicsEngine";
import { calculateWaveProperties, calculateEcho } from "../utils/calculateWaves";
import { SineWave } from "../objects/SineWave";
import { EchoSimulation } from "../objects/EchoSimulation";
import { WaveGraphs } from "../graphs/WaveGraphs";
import { PlaybackControls } from "../../shared/playback/PlaybackControls";
import { GraphGrid } from "../../shared/graph/GraphGrid";

export function WaveScene({
  params,
  updateParam,
}: {
  params: PhysicsLabParams;
  updateParam: <Key extends keyof PhysicsLabParams>(key: Key, value: PhysicsLabParams[Key]) => void;
}) {
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // We map progress 0->1 for visual loops. 
  useEffect(() => {
    if (!isPlaying) return;
    
    let frameId: number;
    let lastTime = performance.now();
    
    // Animate based on the frequency to give a realistic sense of speed
    // Higher frequency = faster animation
    const speedFactor = params.frequency * 0.2; 

    const animate = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      
      setProgress((p) => {
        const next = p + delta * speedFactor;
        return next % 1; // loop
      });
      frameId = requestAnimationFrame(animate);
    };
    
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, params.frequency]);

  const echoData = calculateEcho(params);

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-md border border-[#20242b] bg-[#0d1117]">
        <svg viewBox="0 0 640 280" className="h-[280px] w-full">
          <GraphGrid />
          
          {params.formulaId === "echo-distance" ? (
            <EchoSimulation params={params} progress={progress} velocity={echoData.velocity} />
          ) : (
            <SineWave params={params} progress={progress} />
          )}
        </svg>
      </div>

      <PlaybackControls 
        isPlaying={isPlaying}
        startAnimation={() => setIsPlaying(true)}
        pauseAnimation={() => setIsPlaying(false)}
        resetAnimation={() => setProgress(0)}
      />

      <WaveGraphs params={params} formulaId={params.formulaId} time={progress} />
    </div>
  );
}
