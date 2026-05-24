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

export type LearningVisualBlock =
  | {
      id: string;
      type: "physics.projectile";
      params: ProjectileParams;
    }
  | {
      id: string;
      type: "math.sineGraph";
      params: SineGraphParams;
    }
  | {
      id: string;
      type: "physics.forceMotion";
      params: ForceMotionParams;
    }
  | {
      id: string;
      type: "physics.engineLab";
      params: Partial<PhysicsLabParams>;
    }
  | {
      id: string;
      type: "math.quadraticGraph";
      params: QuadraticParams;
    };
