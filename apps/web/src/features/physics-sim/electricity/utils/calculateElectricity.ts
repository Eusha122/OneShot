import type { PhysicsLabParams } from "../../sscPhysicsEngine";

export function calculateElectricity(params: PhysicsLabParams) {
  // Constants
  const k = 8.9875517923e9; // Coulomb's constant N m²/C²
  
  // 1. Coulomb's Law
  const distanceMeters = params.distance;
  const q1 = params.charge; // Treat as q1
  const q2 = 1.6e-19; // Elementary charge for q2 if not provided, or use same
  const force = (k * Math.abs(q1) * Math.abs(q2)) / (distanceMeters * distanceMeters);
  
  // 2. Electric Field
  const eField = force / Math.abs(q2);

  // 3. Ohm's Law & Power
  const V = params.voltage;
  // If we are looking at specific resistance scenarios we use params.resistance
  let R = params.resistance;
  
  if (params.formulaId === "wire-resistance") {
    // R = rho * L / A
    // Using copper resistivity as default approx 1.68e-8
    const rho = 1.68e-8;
    const L = params.distance; // reuse distance for length
    const A = params.area;
    R = (rho * L) / A;
  } else if (params.formulaId === "series-resistance") {
    // R = R1 + R2 (demo uses R1 = params.resistance and R2 = params.resistance * 1.5)
    R = params.resistance + (params.resistance * 1.5);
  } else if (params.formulaId === "parallel-resistance") {
    // 1/R = 1/R1 + 1/R2
    const r1 = params.resistance;
    const r2 = params.resistance * 1.5;
    R = 1 / (1/r1 + 1/r2);
  }

  const current = V / R;
  const power = V * current;
  
  // 4. Charge over time I = Q/t => Q = I*t
  const chargeOverTime = current * params.t;

  return {
    force,
    eField,
    current,
    resistance: R,
    power,
    chargeOverTime,
  };
}
