import { useEffect, useId, useRef, useState } from "react";
import JXG from "jsxgraph";
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { formatSineEquation, type SineGraphParams } from "./functionGraphEngine";

const defaultParams: SineGraphParams = {
  amplitude: 1.4,
  frequency: 1,
  phase: 0,
};

const initialBounds = [-7, 4, 7, -4] as const;

export function FunctionGraph({ initialParams = defaultParams }: { initialParams?: SineGraphParams }) {
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
          name: "x",
          ticks: {
            drawLabels: true,
            minorTicks: 4,
            ticksDistance: 1,
          },
        },
        y: {
          name: "y",
          ticks: {
            drawLabels: true,
            minorTicks: 4,
            ticksDistance: 1,
          },
        },
      },
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
    functionRef.current = board.create(
      "functiongraph",
      [(x: number) => evaluateSine(x, initialParamsRef.current)],
      {
        highlight: false,
        strokeColor: "#f5f5f5",
        strokeWidth: 2.5,
      },
    ) as JXG.Curve;

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
    boardRef.current?.setBoundingBox([...initialBounds], false);
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
      <div className="relative overflow-hidden rounded-md border border-[#1f1f1f] bg-[#f8f8f8]">
        <div id={boardId} className="h-[320px] w-full touch-none sm:h-[380px]" />
        <div className="absolute right-2 top-2 flex gap-1 rounded-md border border-black/10 bg-white/90 p-1 shadow-sm">
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
        <span className="inline-flex items-center gap-1.5">
          <Maximize2 size={12} />
          Pan and zoom enabled
        </span>
      </div>

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
      className="grid h-8 w-8 place-items-center rounded text-[#222222] transition hover:bg-black/10"
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
    <label className="block">
      <span className="flex items-center justify-between text-xs text-[#9ca3af]">
        <span>{label}</span>
        <span>{value.toFixed(1)}</span>
      </span>
      <input
        className="mt-2 w-full accent-[#f5f5f5]"
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="range"
        value={value}
      />
    </label>
  );
}

function evaluateSine(x: number, params: SineGraphParams) {
  return params.amplitude * Math.sin(params.frequency * x + params.phase);
}
