import { PhysicsLabParams } from "../../sscPhysicsEngine";
import { CollisionState } from "./CollisionState";

export function calculateCollision(params: PhysicsLabParams): CollisionState {
  const m1 = params.mass1 ?? 5;
  const m2 = params.mass2 ?? 10;
  const u1 = params.u1 ?? 5;
  const u2 = params.u2 ?? 0;
  
  const massSum = m1 + m2;
  let v1 = 0;
  let v2 = 0;
  if (massSum > 0) {
    v1 = ((m1 - m2) / massSum) * u1 + ((2 * m2) / massSum) * u2;
    v2 = ((2 * m1) / massSum) * u1 + ((m2 - m1) / massSum) * u2;
  }

  const totalMomentumBefore = m1 * u1 + m2 * u2;
  const totalMomentumAfter = m1 * v1 + m2 * v2;
  
  const collisionTime = 0.5; // Simulate collision at halfway point of a 1s scale

  return {
    particleA: { mass: m1, velocity: v1, position: u1 }, // store u1 as position hack for helper
    particleB: { mass: m2, velocity: v2, position: u2 },
    totalMomentumBefore,
    totalMomentumAfter,
    collisionTime,
  };
}
