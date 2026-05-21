import type { SineGraphParams } from "../math-visualizer/functionGraphEngine";
import type { ProjectileParams } from "../physics-sim/projectileEngine";

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
    };
