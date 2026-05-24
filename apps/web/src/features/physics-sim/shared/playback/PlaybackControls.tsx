import React from "react";
import { Pause, Play, RotateCcw } from "lucide-react";

export function PlaybackControls({
  isPlaying,
  startAnimation,
  pauseAnimation,
  resetAnimation,
}: {
  isPlaying: boolean;
  startAnimation: () => void;
  pauseAnimation: () => void;
  resetAnimation: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-end gap-3 border-t border-[#333] pt-4">
      <button
        onClick={isPlaying ? pauseAnimation : startAnimation}
        className="flex items-center gap-2 rounded bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-gray-200"
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
        {isPlaying ? "Pause" : "Play"}
      </button>
      <button
        onClick={resetAnimation}
        className="flex items-center gap-2 rounded border border-[#444] px-4 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-[#222]"
      >
        <RotateCcw size={16} />
        Reset
      </button>
    </div>
  );
}
