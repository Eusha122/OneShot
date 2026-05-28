import { useEffect, useRef, useState, useCallback } from "react";

interface UsePhysicsEngineProps {
  duration?: number; // Total physical duration (e.g. state.t)
  onUpdate: (timeFrac: number, dt: number) => void;
  onFinish?: () => void;
  throttleMs?: number;
}

export function usePhysicsEngine({
  duration = 1,
  onUpdate,
  onFinish,
  throttleMs = 100, // For UI throttled state
}: UsePhysicsEngineProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [uiTimeFrac, setUiTimeFrac] = useState(0); // Throttled state for heavy React components (like graphs)
  
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const timeFracRef = useRef<number>(0);
  const lastUiUpdateRef = useRef<number>(0);

  const onUpdateRef = useRef(onUpdate);
  const onFinishRef = useRef(onFinish);

  // Keep refs fresh so we don't need them in dependency arrays
  useEffect(() => {
    onUpdateRef.current = onUpdate;
    onFinishRef.current = onFinish;
  }, [onUpdate, onFinish]);

  const stopAnimation = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const startAnimation = useCallback(() => {
    if (isPlaying) return;
    setIsPlaying(true);
    
    if (timeFracRef.current >= 1) {
      timeFracRef.current = 0;
      setUiTimeFrac(0);
    }
    
    lastTimeRef.current = performance.now();
    lastUiUpdateRef.current = performance.now();
    
    function animate(now: number) {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      
      const realDuration = Math.max(0.5, duration);
      timeFracRef.current += dt / realDuration;

      if (timeFracRef.current >= 1) {
        timeFracRef.current = 1;
        onUpdateRef.current(1, dt);
        setUiTimeFrac(1);
        setIsPlaying(false);
        if (onFinishRef.current) onFinishRef.current();
        return;
      }

      // Call the imperative update callback (this modifies DOM refs directly, ZERO React overhead)
      onUpdateRef.current(timeFracRef.current, dt);

      // Throttle the React state update for heavy UI (graphs, overlays)
      if (now - lastUiUpdateRef.current >= throttleMs) {
        setUiTimeFrac(timeFracRef.current);
        lastUiUpdateRef.current = now;
      }

      animationRef.current = requestAnimationFrame(animate);
    }
    
    animationRef.current = requestAnimationFrame(animate);
  }, [isPlaying, duration, throttleMs]);

  const resetAnimation = useCallback(() => {
    stopAnimation();
    timeFracRef.current = 0;
    setUiTimeFrac(0);
    onUpdateRef.current(0, 0); // Reset visual DOM immediately
  }, [stopAnimation]);

  useEffect(() => {
    return stopAnimation;
  }, [stopAnimation]);

  return {
    isPlaying,
    uiTimeFrac, // Throttled (5-10 FPS) for graphs
    timeFracRef, // Live (60 FPS) for use in other callbacks if needed
    startAnimation,
    stopAnimation,
    resetAnimation,
  };
}
