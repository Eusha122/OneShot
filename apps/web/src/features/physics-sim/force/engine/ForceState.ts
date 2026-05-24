export type ParticleState = {
  mass: number;
  velocity: number;
  position: number;
};

export type ForceState = {
  mass?: number;
  acceleration?: number;
  force?: number;
  velocity?: number;
  momentum?: number;
  radius?: number;
  distance?: number;
  position?: number;
  time?: number;
  particles?: ParticleState[];
};
