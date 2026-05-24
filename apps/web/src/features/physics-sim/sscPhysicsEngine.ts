import type { SimulationSchema } from "./SimulationSchema";

export type PhysicsLabScenario = "projectile" | "force" | "energy" | "pressure" | "waves" | "electricity" | "generative" | "kinematics";

export interface PhysicsLabParams {
  scenario: PhysicsLabScenario;
  formulaId: string;
  mass: number;
  mass1: number;
  mass2: number;
  distance: number;
  force: number;
  friction: number;
  speed: number;
  angleDegrees: number;
  gravity: number;
  height: number;
  depth: number;
  density: number;
  area: number;
  frequency: number;
  wavelength: number;
  amplitude: number;
  voltage: number;
  resistance: number;
  u: number;
  v: number;
  u1: number;
  u2: number;
  v1: number;
  v2: number;
  radius: number;
  a: number;
  t: number;
  s: number;
  schema?: SimulationSchema;
}

export interface FormulaDefinition {
  id: string;
  chapter: string;
  title: string;
  expression: string;
  latex: string;
  variables: string;
  scenario?: PhysicsLabScenario;
}

export const defaultPhysicsLabParams: PhysicsLabParams = {
  scenario: "projectile",
  formulaId: "",
  mass: 8,
  mass1: 6,
  mass2: 10,
  distance: 5,
  force: 48,
  friction: 0.2,
  speed: 32,
  angleDegrees: 42,
  gravity: 9.8,
  height: 18,
  depth: 4,
  density: 1000,
  area: 0.8,
  frequency: 4,
  wavelength: 2.5,
  amplitude: 1,
  voltage: 12,
  resistance: 6,
  u: 0,
  v: 10,
  u1: 5,
  u2: 0,
  v1: 2,
  v2: 3,
  radius: 10,
  a: 2,
  t: 5,
  s: 25,
};

export const motionFormulas: FormulaDefinition[] = [
  {
    id: "velocity",
    chapter: "Motion",
    title: "Speed or velocity",
    expression: "v = s / t",
    latex: "v = \\frac{s}{t}",
    variables: "s = displacement, t = time",
    scenario: "kinematics",
  },
  {
    id: "acceleration",
    chapter: "Motion",
    title: "Acceleration",
    expression: "a = (v - u) / t",
    latex: "a = \\frac{v-u}{t}",
    variables: "u = initial velocity, v = final velocity",
    scenario: "kinematics",
  },
  {
    id: "motion-1",
    chapter: "Motion",
    title: "First equation of motion",
    expression: "v = u + at",
    latex: "v = u + at",
    variables: "a = acceleration, t = time",
    scenario: "kinematics",
  },
  {
    id: "motion-2",
    chapter: "Motion",
    title: "Average velocity and displacement",
    expression: "s = ((u + v) / 2) t",
    latex: "s = \\left(\\frac{u+v}{2}\\right)t",
    variables: "u = initial velocity, v = final velocity, t = time",
    scenario: "kinematics",
  },
  {
    id: "motion-3",
    chapter: "Motion",
    title: "Displacement with acceleration",
    expression: "s = ut + 1/2 at^2",
    latex: "s = ut + \\frac{1}{2}at^2",
    variables: "s = displacement, u = initial velocity",
    scenario: "kinematics",
  },
  {
    id: "motion-4",
    chapter: "Motion",
    title: "Velocity-displacement relation",
    expression: "v^2 = u^2 + 2as",
    latex: "v^2 = u^2 + 2as",
    variables: "v = final velocity, u = initial velocity, a = acceleration",
    scenario: "kinematics",
  },
];

export const forceFormulas: FormulaDefinition[] = [
  {
    id: "gravitational-force",
    chapter: "Force",
    title: "Newton's law of gravitation",
    expression: "F = G m1 m2 / r^2",
    latex: "F = G\\frac{m_1m_2}{r^2}",
    variables: "G = gravitational constant, m1 and m2 = masses, r = distance",
    scenario: "force",
  },
  {
    id: "newton-second-law",
    chapter: "Force",
    title: "Newton's second law",
    expression: "F = ma",
    latex: "F = ma",
    variables: "F = net force, m = mass, a = acceleration",
    scenario: "force",
  },
  {
    id: "momentum",
    chapter: "Force",
    title: "Momentum",
    expression: "p = mv",
    latex: "p = mv",
    variables: "m = mass, v = velocity",
    scenario: "force",
  },
  {
    id: "impulse",
    chapter: "Force",
    title: "Impulse of Force",
    expression: "J = Ft = m(v - u)",
    latex: "J = Ft = m(v - u)",
    variables: "J = impulse, F = force, t = time, m = mass",
    scenario: "force",
  },
  {
    id: "conservation",
    chapter: "Force",
    title: "Conservation of Momentum",
    expression: "m1u1 + m2u2 = m1v1 + m2v2",
    latex: "m_1u_1 + m_2u_2 = m_1v_1 + m_2v_2",
    variables: "m = mass, u = initial velocity, v = final velocity",
    scenario: "force",
  },
  {
    id: "centripetal",
    chapter: "Force",
    title: "Centripetal Force",
    expression: "F = mv^2 / r",
    latex: "F = \\frac{mv^2}{r}",
    variables: "m = mass, v = velocity, r = radius",
    scenario: "force",
  },
];

export const energyFormulas: FormulaDefinition[] = [
  {
    id: "work",
    chapter: "Work, Power, and Energy",
    title: "Work",
    expression: "W = Fs cos(theta)",
    latex: "W = Fs\\cos\\theta",
    variables: "F = force, s = displacement",
    scenario: "energy",
  },
  {
    id: "kinetic-energy",
    chapter: "Work, Power, and Energy",
    title: "Kinetic energy",
    expression: "Ek = 1/2 mv^2",
    latex: "E_k = \\frac{1}{2}mv^2",
    variables: "m = mass, v = velocity",
    scenario: "energy",
  },
  {
    id: "potential-energy",
    chapter: "Work, Power, and Energy",
    title: "Potential energy",
    expression: "Ep = mgh",
    latex: "E_p = mgh",
    variables: "m = mass, g = gravity, h = height",
    scenario: "energy",
  },
];

export const pressureFormulas: FormulaDefinition[] = [
  {
    id: "pressure",
    chapter: "State of Matter and Pressure",
    title: "Pressure",
    expression: "P = F / A",
    latex: "P = \\frac{F}{A}",
    variables: "F = force, A = area",
    scenario: "pressure",
  },
  {
    id: "liquid-pressure",
    chapter: "State of Matter and Pressure",
    title: "Pressure in liquids",
    expression: "P = h rho g",
    latex: "P = h\\rho g",
    variables: "h = depth, rho = density, g = gravity",
    scenario: "pressure",
  },
];

export const waveFormulas: FormulaDefinition[] = [
  {
    id: "wave-velocity",
    chapter: "Waves and Sound",
    title: "Wave velocity",
    expression: "v = f lambda",
    latex: "v = f\\lambda",
    variables: "f = frequency, lambda = wavelength",
    scenario: "waves",
  },
  {
    id: "frequency-period",
    chapter: "Waves and Sound",
    title: "Time period and frequency",
    expression: "f = 1 / T",
    latex: "f = \\frac{1}{T}",
    variables: "T = time period, f = frequency",
    scenario: "waves",
  },
  {
    id: "echo-distance",
    chapter: "Waves and Sound",
    title: "Echo distance",
    expression: "2d = vt",
    latex: "2d = vt",
    variables: "d = distance to reflector, v = sound speed, t = echo time",
    scenario: "waves",
  },
];

export const lightFormulas: FormulaDefinition[] = [
  {
    id: "lens-mirror",
    chapter: "Reflection and Refraction of Light",
    title: "Mirror or lens formula",
    expression: "1/v + 1/u = 1/f",
    latex: "\\frac{1}{v} + \\frac{1}{u} = \\frac{1}{f}",
    variables: "u = object distance, v = image distance",
  },
];

export const electricityFormulas: FormulaDefinition[] = [
  {
    id: "ohms-law",
    chapter: "Electricity",
    title: "Ohm's law",
    expression: "V = IR",
    latex: "V = IR",
    variables: "V = voltage, I = current, R = resistance",
    scenario: "electricity",
  },
  {
    id: "electric-power",
    chapter: "Electricity",
    title: "Electric power",
    expression: "P = VI = I^2R = V^2/R",
    latex: "P = VI = I^2R = \\frac{V^2}{R}",
    variables: "V = voltage, I = current, R = resistance",
    scenario: "electricity",
  },
];

export const physicsFormulaChapters = [
  { id: "motion", title: "Motion", formulas: motionFormulas },
  { id: "force", title: "Force", formulas: forceFormulas },
  { id: "energy", title: "Work, Power, and Energy", formulas: energyFormulas },
  { id: "pressure", title: "State of Matter and Pressure", formulas: pressureFormulas },
  { id: "waves", title: "Waves and Sound", formulas: waveFormulas },
  { id: "light", title: "Reflection and Refraction of Light", formulas: lightFormulas },
  { id: "electricity", title: "Electricity", formulas: electricityFormulas },
];

export const sscPhysicsFormulaRegistry = physicsFormulaChapters.flatMap((chapter) => chapter.formulas);

export function formulasForScenario(scenario: PhysicsLabScenario) {
  return sscPhysicsFormulaRegistry.filter((formula) => formula.scenario === scenario);
}

export function formulaById(formulaId: string) {
  return sscPhysicsFormulaRegistry.find((formula) => formula.id === formulaId);
}

export function calculateProjectile(params: PhysicsLabParams) {
  const angle = degreesToRadians(params.angleDegrees);
  const vx = params.speed * Math.cos(angle);
  const vy = params.speed * Math.sin(angle);
  const flightTime = (2 * vy) / params.gravity;
  const range = vx * flightTime;
  const maxHeight = (vy * vy) / (2 * params.gravity);

  return {
    flightTime,
    maxHeight,
    range,
    vx,
    vy,
  };
}

export function calculateForceMotion(params: PhysicsLabParams) {
  const frictionForce = params.friction * params.mass * params.gravity;
  const netForce = params.force > frictionForce ? params.force - frictionForce : 0;
  const acceleration = netForce / params.mass;
  const finalVelocityAfter3s = acceleration * 3;
  const displacementAfter3s = 0.5 * acceleration * 3 * 3;
  const momentumAfter3s = params.mass * finalVelocityAfter3s;

  return {
    acceleration,
    displacementAfter3s,
    finalVelocityAfter3s,
    frictionForce,
    momentumAfter3s,
    netForce,
  };
}

export function calculateGravitationalForce(params: PhysicsLabParams) {
  const gravitationalConstant = 6.67e-11;
  const force = gravitationalConstant * ((params.mass1 * params.mass2) / (params.distance * params.distance));

  return {
    force,
    gravitationalConstant,
  };
}

export function calculateEnergy(params: PhysicsLabParams) {
  const potentialEnergy = params.mass * params.gravity * params.height;
  const impactVelocity = Math.sqrt(2 * params.gravity * params.height);
  const kineticEnergyAtBottom = 0.5 * params.mass * impactVelocity * impactVelocity;
  const powerIfReleasedIn3s = potentialEnergy / 3;

  return {
    impactVelocity,
    kineticEnergyAtBottom,
    potentialEnergy,
    powerIfReleasedIn3s,
  };
}

export function calculatePressure(params: PhysicsLabParams) {
  const liquidPressure = params.depth * params.density * params.gravity;
  const appliedPressure = params.force / params.area;
  const buoyancyForOneCubicMeter = params.density * params.gravity;

  return {
    appliedPressure,
    buoyancyForOneCubicMeter,
    liquidPressure,
  };
}

export function calculateWave(params: PhysicsLabParams) {
  const velocity = params.frequency * params.wavelength;
  const period = 1 / params.frequency;
  const echoDistanceAfterTwoSeconds = velocity;

  return {
    echoDistanceAfterTwoSeconds,
    period,
    velocity,
  };
}

export function calculateElectricity(params: PhysicsLabParams) {
  const current = params.voltage / params.resistance;
  const power = params.voltage * current;
  const energyInOneMinute = power * 60;

  return {
    current,
    energyInOneMinute,
    power,
  };
}

function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}
