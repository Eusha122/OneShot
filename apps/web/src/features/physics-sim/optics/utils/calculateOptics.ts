import type { PhysicsLabParams } from "../../sscPhysicsEngine";

export function calculateMirrorLens(params: PhysicsLabParams) {
  // 1/v + 1/u = 1/f  =>  1/v = 1/f - 1/u = (u - f) / uf
  // v = uf / (u - f)
  // Note: if u == f, image is at infinity (v -> infinity)
  const u = params.lensDistance;
  const f = params.focalLength;
  
  let v = Infinity;
  if (Math.abs(u - f) > 0.001) {
    v = (u * f) / (u - f);
  }

  const magnification = -v / u;
  
  // Power of lens P = 1 / f(in meters).
  // f is in cm for UI purposes, so P = 100 / f (converting cm → m)
  const power = 100 / f;

  return {
    v,
    magnification,
    power,
    isVirtual: v < 0,
    isReal: v > 0 && v !== Infinity,
  };
}

export function calculateRefraction(params: PhysicsLabParams) {
  const n1 = params.refractiveIndex;
  const n2 = params.refractiveIndex2;
  const angleOfIncidenceDeg = params.angleDegrees;
  
  const angleOfIncidenceRad = (angleOfIncidenceDeg * Math.PI) / 180;
  
  // Snell's Law: n1 * sin(i) = n2 * sin(r)
  // sin(r) = (n1 / n2) * sin(i)
  const sinR = (n1 / n2) * Math.sin(angleOfIncidenceRad);
  
  let angleOfRefractionRad = 0;
  let isTotalInternalReflection = false;

  if (sinR > 1.0) {
    isTotalInternalReflection = true;
    angleOfRefractionRad = angleOfIncidenceRad; // Reflection: angle of reflection = angle of incidence
  } else {
    angleOfRefractionRad = Math.asin(sinR);
  }

  const angleOfRefractionDeg = (angleOfRefractionRad * 180) / Math.PI;

  // Critical angle: sin(theta_c) = n2 / n1 (only if n1 > n2)
  let criticalAngleDeg = null;
  if (n1 > n2) {
    criticalAngleDeg = (Math.asin(n2 / n1) * 180) / Math.PI;
  }

  return {
    angleOfRefractionDeg,
    isTotalInternalReflection,
    criticalAngleDeg,
  };
}
