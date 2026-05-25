import { useEffect, useId, useRef, useState } from "react";
import JXG from "jsxgraph";
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { RevealControls } from "../visual-blocks/ProgressiveReveal";
import type { VisualBlockPhase } from "../visual-blocks/visualBlockTypes";
import { formatSineEquation, type SineGraphParams } from "./functionGraphEngine";

const defaultParams: SineGraphParams = {
  amplitude: 1.4,
  frequency: 1,
  phase: 0,
};

const initialBounds = [-7, 4, 7, -4] as const;
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

export function FunctionGraph({
  initialParams = defaultParams,
  phase = "interactive",
}: {
  initialParams?: SineGraphParams;
  phase?: VisualBlockPhase;
}) {
  const rawBoardId = useId();
  const boardId = `graph-${rawBoardId.replace(/:/g, "")}`;
  const boardRef = useRef<JXG.Board | null>(null);
  const functionRef = useRef<JXG.Curve | null>(null);
  const initialParamsRef = useRef(initialParams);
  const [params, setParams] = useState(initialParams);

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
      keepAspectRatio: true,
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
    functionRef.current = board.create(
      "functiongraph",
      [(x: number) => evaluateSine(x, initialParamsRef.current)],
      {
        highlight: false,
        strokeColor: "#ff3b30",
        strokeOpacity: 1,
        strokeWidth: 3,
        numberPointsHigh: 900,
        numberPointsLow: 260,
      },
    ) as JXG.Curve;

    board.create("point", [0, 0], {
      fixed: true,
      highlight: false,
      name: "",
      size: 2,
      strokeColor: "#444444",
      fillColor: "#444444",
      withLabel: false,
    });

    const resizeObserver = new ResizeObserver(() => {
      board.resizeContainer(board.containerObj.clientWidth, board.containerObj.clientHeight);
      board.update();
    });
    resizeObserver.observe(board.containerObj);

    return () => {
      resizeObserver.disconnect();
      JXG.JSXGraph.freeBoard(board);
      boardRef.current = null;
      functionRef.current = null;
    };
  }, [boardId]);

  useEffect(() => {
    const board = boardRef.current;
    const graph = functionRef.current;
    if (!board || !graph) return;

    graph.Y = (x: number) => evaluateSine(x, params);
    board.update();
  }, [params]);

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

  function replay() {
    setParams(initialParams);
    resetView();
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
        <span>{formatSineEquation(params)}</span>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <Maximize2 size={12} />
            Pan and zoom enabled
          </span>
          <button
            type="button"
            aria-label="Replay sine graph"
            onClick={replay}
            className="inline-flex items-center gap-1.5 text-[#9ca3af] transition hover:text-[#f5f5f5]"
          >
            <RotateCcw size={13} />
            Replay
          </button>
        </div>
      </div>

      <RevealControls visible={phase === "interactive"}>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Slider
            label="Amplitude"
            max={3}
            min={0.5}
            onChange={(amplitude) => setParams((current) => ({ ...current, amplitude }))}
            step={0.1}
            value={params.amplitude}
          />
          <Slider
            label="Frequency"
            max={3}
            min={0.5}
            onChange={(frequency) => setParams((current) => ({ ...current, frequency }))}
            step={0.1}
            value={params.frequency}
          />
          <Slider
            label="Phase"
            max={3.14}
            min={-3.14}
            onChange={(phase) => setParams((current) => ({ ...current, phase }))}
            step={0.1}
            value={params.phase}
          />
        </div>
      </RevealControls>
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
          className="w-16 rounded border border-[#333] bg-[#1a1a1a] px-1 py-0.5 text-right text-xs text-[#f5f5f5] focus:border-[#ff3b30] focus:outline-none"
        />
      </div>
      <input
        className="mt-2 w-full accent-[#ff3b30]"
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

function evaluateSine(x: number, params: SineGraphParams) {
  return params.amplitude * Math.sin(params.frequency * x + params.phase);
}
