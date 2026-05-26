import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { RevealTiming, VisualBlockPhase } from "./visualBlockTypes";
import { defaultRevealTiming } from "./visualBlockTypes";

/**
 * Progressive reveal wrapper for visual blocks.
 * Stages: container fades in -> content renders -> controls appear.
 */
export function ProgressiveReveal({
  children,
  timing = defaultRevealTiming,
}: {
  children: (phase: VisualBlockPhase) => React.ReactNode;
  timing?: RevealTiming;
}) {
  const [phase, setPhase] = useState<VisualBlockPhase>("entering");

  useEffect(() => {
    let controlsTimer: ReturnType<typeof setTimeout>;
    const contentTimer = setTimeout(() => {
      setPhase("revealed");
      // Controls timer starts only after "revealed", treating controlsDelay as
      // a relative delay from the reveal moment.
      controlsTimer = setTimeout(() => setPhase("interactive"), timing.controlsDelay);
    }, timing.contentDelay);

    return () => {
      clearTimeout(contentTimer);
      clearTimeout(controlsTimer);
    };
  }, [timing.contentDelay, timing.controlsDelay]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: timing.containerDelay / 1000 }}
    >
      {children(phase)}
    </motion.div>
  );
}

/**
 * Fade-in wrapper for controls/sliders that appear in the last stage.
 */
export function RevealControls({
  visible,
  children,
}: {
  visible: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 6 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{ pointerEvents: visible ? "auto" : "none" }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Fade-in wrapper for visual content that appears in the second stage.
 */
export function RevealContent({
  visible,
  children,
}: {
  visible: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
