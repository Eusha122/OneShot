import { MotionState } from '../engine/MotionState';

export function calculateKinematics(formulaId: string, params: Record<string, number>): MotionState {
  const u = params.u ?? 0;
  let v = params.v ?? 0;
  let a = params.a ?? 0;
  let t = params.t ?? 0;
  let s = params.s ?? 0;

  switch (formulaId) {
    case "velocity":
      // v = s / t
      v = t !== 0 ? s / t : 0;
      a = 0;
      break;
    case "acceleration":
      // a = (v - u) / t
      a = t !== 0 ? (v - u) / t : 0;
      s = u * t + 0.5 * a * t * t;
      break;
    case "motion-1":
      // v = u + at
      v = u + a * t;
      s = u * t + 0.5 * a * t * t;
      break;
    case "motion-2":
      // s = ((u + v) / 2) * t
      s = ((u + v) / 2) * t;
      a = t !== 0 ? (v - u) / t : 0;
      break;
    case "motion-3":
      // s = ut + 0.5 * a * t^2
      s = u * t + 0.5 * a * t * t;
      v = u + a * t;
      break;
    case "motion-4":
      // v^2 = u^2 + 2as
      // If s and a are given, find v. (Assuming positive root for simplicity unless we know direction)
      const v2 = u * u + 2 * a * s;
      v = v2 >= 0 ? Math.sqrt(v2) : 0; 
      t = a !== 0 ? (v - u) / a : 0;
      if (t < 0) t = 0; // clamp negative time visually
      break;
  }

  return { u, v, a, s, t };
}
