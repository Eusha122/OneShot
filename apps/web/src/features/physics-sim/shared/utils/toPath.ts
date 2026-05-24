export function toPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  return rest.reduce(
    (path, point) => `${path} L${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
    `M${first.x.toFixed(2)} ${first.y.toFixed(2)}`
  );
}
