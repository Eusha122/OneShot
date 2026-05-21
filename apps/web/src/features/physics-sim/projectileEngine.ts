export interface ProjectileParams {
  speed: number;
  angleDegrees: number;
  gravity: number;
}

export interface ProjectilePoint {
  time: number;
  x: number;
  y: number;
}

export interface ProjectileMetrics {
  range: number;
  maxHeight: number;
  flightTime: number;
  initialVelocityX: number;
  initialVelocityY: number;
}

export interface ProjectileSimulation {
  points: ProjectilePoint[];
  metrics: ProjectileMetrics;
}

const degreesToRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function calculateProjectileSimulation(
  params: ProjectileParams,
  sampleCount = 80,
): ProjectileSimulation {
  const angle = degreesToRadians(params.angleDegrees);
  const initialVelocityX = params.speed * Math.cos(angle);
  const initialVelocityY = params.speed * Math.sin(angle);
  const flightTime = (2 * initialVelocityY) / params.gravity;
  const range = initialVelocityX * flightTime;
  const maxHeight = (initialVelocityY * initialVelocityY) / (2 * params.gravity);
  const safeSampleCount = Math.max(2, sampleCount);

  const points = Array.from({ length: safeSampleCount }, (_, index) => {
    const time = (flightTime * index) / (safeSampleCount - 1);
    return {
      time,
      x: initialVelocityX * time,
      y: initialVelocityY * time - 0.5 * params.gravity * time * time,
    };
  });

  return {
    points,
    metrics: {
      range,
      maxHeight,
      flightTime,
      initialVelocityX,
      initialVelocityY,
    },
  };
}

export function pointAtProgress(points: ProjectilePoint[], progress: number): ProjectilePoint {
  if (points.length === 0) return { time: 0, x: 0, y: 0 };
  const boundedProgress = Math.min(1, Math.max(0, progress));
  const rawIndex = boundedProgress * (points.length - 1);
  const lowerIndex = Math.floor(rawIndex);
  const upperIndex = Math.min(points.length - 1, lowerIndex + 1);
  const mix = rawIndex - lowerIndex;
  const lower = points[lowerIndex];
  const upper = points[upperIndex];

  return {
    time: lower.time + (upper.time - lower.time) * mix,
    x: lower.x + (upper.x - lower.x) * mix,
    y: lower.y + (upper.y - lower.y) * mix,
  };
}
