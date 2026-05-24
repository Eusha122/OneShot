export type CollisionState = {
  particleA: {
    mass: number;
    velocity: number;
    position: number;
  };

  particleB: {
    mass: number;
    velocity: number;
    position: number;
  };

  totalMomentumBefore: number;
  totalMomentumAfter: number;

  collisionTime: number;
};
