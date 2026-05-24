import type { PhysicsLabParams } from "../../sscPhysicsEngine";

export function calculateWaveProperties(params: PhysicsLabParams) {
  const period = 1 / params.frequency;
  const velocity = params.frequency * params.wavelength;

  return {
    period,
    velocity,
  };
}

export function calculateEcho(params: PhysicsLabParams) {
  const velocity = params.frequency * params.wavelength;
  const oneWayDistance = params.distance;
  const totalDistance = 2 * oneWayDistance;
  const roundTripTime = totalDistance / velocity;

  // How far would sound travel in 2 seconds?
  // If the round trip completes within 2s, the echo covers totalDistance.
  // Otherwise, it's just velocity * 2 (distance traveled in 2s).
  const echoDistanceAfterTwoSeconds = roundTripTime <= 2
    ? totalDistance
    : velocity * 2;

  return {
    velocity,
    echoDistanceAfterTwoSeconds,
    totalDistance,
    oneWayDistance,
    roundTripTime,
  };
}
