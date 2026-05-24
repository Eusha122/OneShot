import { ForceState } from '../engine/ForceState';

export function calculateForces(formulaId: string, params: Record<string, number>): ForceState {
  // Extract parameters with defaults
  const m = params.mass ?? 10;
  const v = params.v ?? 0;
  const u = params.u ?? 0;
  const a = params.a ?? 0;
  const f = params.force ?? 0;
  const t = params.t ?? 0;
  const r = params.radius ?? 10;
  
  const m1 = params.mass1 ?? 5;
  const m2 = params.mass2 ?? 10;
  const u1 = params.u1 ?? 5;
  const u2 = params.u2 ?? 0;
  const d = params.distance ?? 5;

  let state: ForceState = {};

  switch (formulaId) {
    case "momentum":
      // p = mv
      state = {
        mass: m,
        velocity: v,
        momentum: m * v,
        time: t
      };
      break;

    case "newton-second-law":
      // F = ma
      state = {
        mass: m,
        force: f,
        acceleration: m > 0 ? f / m : 0,
        time: t,
        velocity: u + (m > 0 ? f / m : 0) * t,
        position: u * t + 0.5 * (m > 0 ? f / m : 0) * t * t
      };
      break;

    case "impulse":
      // J = Ft = m(v - u) => J = F * t; v = u + J/m
      const impulse = f * t;
      const finalVel = u + (m > 0 ? impulse / m : 0);
      state = {
        mass: m,
        force: f,
        time: t,
        velocity: finalVel,
        momentum: impulse, // change in momentum
        position: u * t // Approximation before impulse happens instantly
      };
      break;

    case "conservation":
      state = { time: t };
      break;

    case "centripetal":
      // F = mv^2 / r
      state = {
        mass: m,
        velocity: v,
        radius: r,
        force: r > 0 ? (m * v * v) / r : 0,
        time: t
      };
      break;

    case "gravitational-force":
      // F = G m1 m2 / r^2
      // Use visual G for UI scaling
      const visualG = 1000;
      const fg = d > 0 ? (visualG * m1 * m2) / (d * d) : 0;
      state = {
        distance: d,
        force: fg,
        time: t,
        particles: [
          { mass: m1, velocity: 0, position: -d/2 },
          { mass: m2, velocity: 0, position: d/2 }
        ]
      };
      break;

    default:
      state = { mass: m, velocity: v };
  }

  return state;
}
