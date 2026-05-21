export interface SineGraphParams {
  amplitude: number;
  frequency: number;
  phase: number;
}

export interface GraphPoint {
  x: number;
  y: number;
}

export interface GraphDomain {
  minX: number;
  maxX: number;
}

export function calculateSineGraph(
  params: SineGraphParams,
  domain: GraphDomain = { minX: -Math.PI * 2, maxX: Math.PI * 2 },
  sampleCount = 160,
): GraphPoint[] {
  const safeSampleCount = Math.max(2, sampleCount);

  return Array.from({ length: safeSampleCount }, (_, index) => {
    const ratio = index / (safeSampleCount - 1);
    const x = domain.minX + (domain.maxX - domain.minX) * ratio;
    return {
      x,
      y: params.amplitude * Math.sin(params.frequency * x + params.phase),
    };
  });
}

export function formatSineEquation(params: SineGraphParams) {
  const amplitude = params.amplitude.toFixed(1);
  const frequency = params.frequency.toFixed(1);
  const phase = params.phase.toFixed(1);
  return `y = ${amplitude} sin(${frequency}x ${params.phase >= 0 ? "+" : "-"} ${Math.abs(Number(phase)).toFixed(1)})`;
}
