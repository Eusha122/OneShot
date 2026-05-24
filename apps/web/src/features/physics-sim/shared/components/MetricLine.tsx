import React from "react";

export function MetricLine({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}
