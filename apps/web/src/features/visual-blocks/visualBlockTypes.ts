import type { SineGraphParams } from "../math-visualizer/functionGraphEngine";
import type { PhysicsLabParams } from "../physics-sim/sscPhysicsEngine";
import type { ProjectileParams } from "../physics-sim/projectileEngine";

export interface ForceMotionParams {
  mass: number;
  force: number;
  friction: number;
}

export interface QuadraticParams {
  a: number;
  b: number;
  c: number;
}

/** Animation phase for progressive rendering of visual blocks */
export type VisualBlockPhase = "entering" | "revealed" | "interactive";

/** Timing config for progressive reveal stages */
export interface RevealTiming {
  /** Delay before container appears (ms) */
  containerDelay: number;
  /** Delay before visual content renders (ms) */
  contentDelay: number;
  /** Delay before controls/sliders appear (ms) */
  controlsDelay: number;
}

export const defaultRevealTiming: RevealTiming = {
  containerDelay: 0,
  contentDelay: 200,
  controlsDelay: 500,
};

export type LearningVisualBlock =
  | {
      id: string;
      type: "physics.projectile";
      params: ProjectileParams;
      replayable?: boolean;
    }
  | {
      id: string;
      type: "math.sineGraph";
      params: SineGraphParams;
      replayable?: boolean;
    }
  | {
      id: string;
      type: "physics.forceMotion";
      params: ForceMotionParams;
      replayable?: boolean;
    }
  | {
      id: string;
      type: "physics.engineLab";
      params: Partial<PhysicsLabParams>;
      replayable?: boolean;
    }
  | {
      id: string;
      type: "math.quadraticGraph";
      params: QuadraticParams;
      replayable?: boolean;
    };
