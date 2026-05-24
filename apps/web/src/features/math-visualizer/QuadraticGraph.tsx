import { useEffect, useId, useRef, useState } from "react";
import JXG from "jsxgraph";
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import type { QuadraticParams } from "../visual-blocks/visualBlockTypes";

const defaultParams: QuadraticParams = {
  a: 1,
  b: 0,
  c: 0,
};

const initialBounds = [-8, 10, 8, -6] as const;
const axisStyle = {
  strokeColor: "#444444",
  strokeOpacity: 1,
  strokeWidth: 1.8,
};
const tickStyle = {
  drawLabels: true,
  drawZero: false,
  minorHeight: 0,
  minorTicks: 0,
  majorHeight: 6,
  strokeColor: "#444444",
  strokeOpacity: 1,
  strokeWidth: 1,
  ticksDistance: 1,
  label: {
    highlight: false,
    strokeColor: "#333333",
    fontSize: 12,
  },
};

export function QuadraticGraph({ initialParams = defaultParams }: { initialParams?: QuadraticParams }) {
  const rawBoardId = useId();
  const boardId = `quad-graph-${rawBoardId.replace(/:/g, "")}`;
  
  const boardRef = useRef<JXG.Board | null>(null);
  const graphRef = useRef<JXG.Curve | null>(null);
  const vertexPointRef = useRef<JXG.Point | null>(null);
  const root1PointRef = useRef<JXG.Point | null>(null);
  const root2PointRef = useRef<JXG.Point | null>(null);

  const initialParamsRef = useRef(initialParams);
  const initialFeaturesRef = useRef(calculateQuadraticFeatures(initialParams));
  const [params, setParams] = useState(initialParams);

  // Compute key points mathematically for overlay
  const { root1, root2, vertexX, vertexY } = calculateQuadraticFeatures(params);

  useEffect(() => {
    JXG.Options.text.useMathJax = false;

    const board = JXG.JSXGraph.initBoard(boardId, {
      axis: true,
      boundingbox: [...initialBounds],
      defaultAxes: {
        x: {
          ...axisStyle,
          name: "",
          withLabel: false,
          ticks: { ...tickStyle, drawZero: true },
        },
        y: {
          ...axisStyle,
          name: "",
          withLabel: false,
          ticks: tickStyle,
        },
      },
      grid: {
        majorStep: 1,
        minorElements: 4,
        strokeColor: "#d4d4d4",
        strokeOpacity: 1,
        strokeWidth: 0.6,
        major: {
          face: "line",
          drawZero: false,
          margin: 0,
          size: 1,
          strokeColor: "#c0c0c0",
          strokeOpacity: 1,
          strokeWidth: 1,
        },
        minor: {
          face: "line",
          drawZero: false,
          margin: 0,
          size: 1,
          strokeColor: "#e5e5e5",
          strokeOpacity: 1,
          strokeWidth: 0.5,
        },
      } as unknown as boolean,
      keepAspectRatio: false,
      pan: {
        enabled: true,
        needShift: false,
      },
      showCopyright: false,
      showNavigation: false,
      zoom: {
        factorX: 1.18,
        factorY: 1.18,
        needShift: false,
        wheel: true,
      },
    });

    boardRef.current = board;

    // Create Parabola Graph
    graphRef.current = board.create(
      "functiongraph",
      [(x: number) => evaluateQuadratic(x, initialParamsRef.current)],
      {
        highlight: false,
        strokeColor: "#3b82f6",
        strokeOpacity: 1,
        strokeWidth: 3,
      },
    ) as JXG.Curve;

    // Create Vertex Point (Red)
    vertexPointRef.current = board.create("point", [initialFeaturesRef.current.vertexX, initialFeaturesRef.current.vertexY], {
      name: "Vertex",
      fillColor: "#ef4444",
      strokeColor: "#ef4444",
      size: 4,
      fixed: true,
      label: {
        offset: [8, 12],
        color: "#ef4444",
        fontWeight: "bold",
      },
    }) as JXG.Point;

    // Create Root 1 Point (Green)
    root1PointRef.current = board.create("point", [initialFeaturesRef.current.root1 !== null ? initialFeaturesRef.current.root1 : 9999, 0], {
      name: initialFeaturesRef.current.root1 !== null ? "Root 1" : "",
      fillColor: "#10b981",
      strokeColor: "#10b981",
      size: 4,
      fixed: true,
      visible: initialFeaturesRef.current.root1 !== null,
      label: {
        offset: [-20, -12],
        color: "#10b981",
        fontWeight: "bold",
      },
    }) as JXG.Point;

    // Create Root 2 Point (Green)
    root2PointRef.current = board.create("point", [initialFeaturesRef.current.root2 !== null ? initialFeaturesRef.current.root2 : 9999, 0], {
      name: initialFeaturesRef.current.root2 !== null ? "Root 2" : "",
      fillColor: "#10b981",
      strokeColor: "#10b981",
      size: 4,
      fixed: true,
      visible: initialFeaturesRef.current.root2 !== null,
      label: {
        offset: [8, -12],
        color: "#10b981",
        fontWeight: "bold",
      },
    }) as JXG.Point;

    const resizeObserver = new ResizeObserver(() => {
      board.resizeContainer(board.containerObj.clientWidth, board.containerObj.clientHeight);
      board.update();
    });
    resizeObserver.observe(board.containerObj);

    return () => {
      resizeObserver.disconnect();
      JXG.JSXGraph.freeBoard(board);
      boardRef.current = null;
      graphRef.current = null;
      vertexPointRef.current = null;
      root1PointRef.current = null;
      root2PointRef.current = null;
    };
  }, [boardId]);

  // Update elements dynamically when parameters change
  useEffect(() => {
    const board = boardRef.current;
    const graph = graphRef.current;
    if (!board || !graph) return;

    graph.Y = (x: number) => evaluateQuadratic(x, params);

    // Update Vertex
    if (vertexPointRef.current) {
      vertexPointRef.current.setPosition(JXG.COORDS_BY_USER, [vertexX, vertexY]);
    }

    // Update Roots
    if (root1PointRef.current) {
      if (root1 !== null) {
        root1PointRef.current.setAttribute({ visible: true, name: `Root: ${root1.toFixed(2)}` });
        root1PointRef.current.setPosition(JXG.COORDS_BY_USER, [root1, 0]);
      } else {
        root1PointRef.current.setAttribute({ visible: false });
      }
    }

    if (root2PointRef.current) {
      if (root2 !== null) {
        root2PointRef.current.setAttribute({ visible: true, name: `Root: ${root2.toFixed(2)}` });
        root2PointRef.current.setPosition(JXG.COORDS_BY_USER, [root2, 0]);
      } else {
        root2PointRef.current.setAttribute({ visible: false });
      }
    }

    board.update();
  }, [params, vertexX, vertexY, root1, root2]);

  function resetView() {
    boardRef.current?.setBoundingBox([...initialBounds], true);
    boardRef.current?.update();
  }

  function zoomIn() {
    boardRef.current?.zoomIn();
  }

  function zoomOut() {
    boardRef.current?.zoomOut();
  }

  return (
    <div className="mt-3 rounded-lg bg-[#111111] p-3">
      <div className="relative overflow-hidden rounded-lg border border-[#d0d0d0] bg-white shadow-sm">
        <div id={boardId} className="math-graph-board h-[320px] w-full touch-none sm:h-[380px]" />
        <div className="absolute right-2 top-2 flex gap-1 rounded-md border border-black/10 bg-white/90 p-1 shadow-sm backdrop-blur">
          <IconButton label="Zoom in" onClick={zoomIn}>
            <Plus size={15} />
          </IconButton>
          <IconButton label="Zoom out" onClick={zoomOut}>
            <Minus size={15} />
          </IconButton>
          <IconButton label="Reset view" onClick={resetView}>
            <RotateCcw size={14} />
          </IconButton>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#9ca3af]">
        <span className="font-mono text-[#e5e7eb] font-semibold">{formatQuadraticEquation(params)}</span>
        <span className="inline-flex items-center gap-1.5">
          <Maximize2 size={12} />
          Pan and zoom enabled
        </span>
      </div>

      {/* Info Boxes */}
      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-mono text-[#9ca3af]">
        <div className="rounded bg-[#1c1c1c] p-2">
          <div className="text-white font-semibold">Vertex:</div>
          <div>({vertexX.toFixed(2)}, {vertexY.toFixed(2)})</div>
        </div>
        <div className="rounded bg-[#1c1c1c] p-2">
          <div className="text-white font-semibold">Roots:</div>
          <div>
            {root1 !== null && root2 !== null
              ? `${root1.toFixed(2)} and ${root2.toFixed(2)}`
              : "No real roots (discriminant < 0)"}
          </div>
        </div>
      </div>

      {/* Sliders */}
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Slider
          label="a (Quad coefficient)"
          max={3}
          min={-3}
          onChange={(a) => setParams((current) => ({ ...current, a }))}
          step={0.1}
          value={params.a}
        />
        <Slider
          label="b (Linear coefficient)"
          max={5}
          min={-5}
          onChange={(b) => setParams((current) => ({ ...current, b }))}
          step={0.1}
          value={params.b}
        />
        <Slider
          label="c (Constant)"
          max={5}
          min={-5}
          onChange={(c) => setParams((current) => ({ ...current, c }))}
          step={0.1}
          value={params.c}
        />
      </div>
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded text-[#555555] transition hover:bg-black/5"
    >
      {children}
    </button>
  );
}

function Slider({
  label,
  max,
  min,
  onChange,
  step,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  value: number;
}) {
  return (
    <div className="block">
      <div className="flex items-center justify-between text-xs text-[#9ca3af]">
        <span>{label}</span>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number(value.toFixed(2))}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val)) {
              onChange(Math.max(min, Math.min(max, val)));
            }
          }}
          className="w-16 rounded border border-[#333] bg-[#1a1a1a] px-1 py-0.5 text-right text-xs text-[#f5f5f5] focus:border-[#3b82f6] focus:outline-none"
        />
      </div>
      <input
        className="mt-2 w-full accent-[#3b82f6]"
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="range"
        value={value}
      />
    </div>
  );
}

function evaluateQuadratic(x: number, params: QuadraticParams) {
  return params.a * x * x + params.b * x + params.c;
}

function calculateQuadraticFeatures(params: QuadraticParams) {
  const discriminant = params.b * params.b - 4 * params.a * params.c;
  const vertexX = -params.b / (2 * params.a || 0.0001);
  const vertexY = evaluateQuadratic(vertexX, params);

  if (discriminant >= 0 && params.a !== 0) {
    return {
      root1: (-params.b - Math.sqrt(discriminant)) / (2 * params.a),
      root2: (-params.b + Math.sqrt(discriminant)) / (2 * params.a),
      vertexX,
      vertexY,
    };
  }

  return {
    root1: null,
    root2: null,
    vertexX,
    vertexY,
  };
}

function formatQuadraticEquation(params: QuadraticParams) {
  const parts: string[] = [];
  
  if (params.a !== 0) {
    const aVal = params.a === 1 ? "" : params.a === -1 ? "-" : params.a.toFixed(1);
    parts.push(`${aVal}x²`);
  }
  
  if (params.b !== 0) {
    const sign = params.b > 0 ? (parts.length > 0 ? "+ " : "") : "- ";
    const bVal = Math.abs(params.b) === 1 ? "" : Math.abs(params.b).toFixed(1);
    parts.push(`${sign}${bVal}x`);
  }
  
  if (params.c !== 0 || parts.length === 0) {
    const sign = params.c > 0 ? (parts.length > 0 ? "+ " : "") : params.c < 0 ? "- " : "";
    parts.push(`${sign}${Math.abs(params.c).toFixed(1)}`);
  }
  
  return `y = ${parts.join(" ")}`;
}
