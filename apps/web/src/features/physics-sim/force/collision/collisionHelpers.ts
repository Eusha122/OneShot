import { CollisionState } from "./CollisionState";

export function getParticlePositionsAtTime(state: CollisionState, time: number, centerX: number) {
  const { particleA, particleB, collisionTime } = state;
  const u1 = particleA.position; // Stored initial velocity as position hack
  const u2 = particleB.position;
  
  const isPostCollision = time > collisionTime;
  
  let x1, x2, vel1, vel2;
  
  if (!isPostCollision) {
    x1 = centerX - u1 * (collisionTime - time) * 10;
    x2 = centerX + Math.abs(u2) * (collisionTime - time) * 10;
    vel1 = u1;
    vel2 = u2;
  } else {
    x1 = centerX + particleA.velocity * (time - collisionTime) * 10;
    x2 = centerX + particleB.velocity * (time - collisionTime) * 10;
    vel1 = particleA.velocity;
    vel2 = particleB.velocity;
  }

  return { x1, x2, vel1, vel2, isPostCollision };
}
