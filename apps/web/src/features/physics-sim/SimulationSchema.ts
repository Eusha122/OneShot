export type SimulationObjectType = 
  | "pendulum"
  | "projectile"
  | "spring"
  | "wave"
  | "vector"
  | "particle"
  | "mass-on-incline"
  | "lens";

export interface SimulationObject {
  id: string;
  type: SimulationObjectType;
  // Generic key-value parameters that the object renderer will interpret
  params: Record<string, number | string | boolean>;
}

export interface SliderDef {
  key: string;       // Maps to a key in the object's `params`
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit?: string;
  color?: string;
}

export interface SimulationSchema {
  sceneType: string;
  title: string;
  description: string;
  objects: SimulationObject[];
  sliders: SliderDef[];
}

// Update the global PhysicsLabScenario type to include "generative"
// This would be merged into visualBlockTypes.ts normally, but we export the core schema here.
