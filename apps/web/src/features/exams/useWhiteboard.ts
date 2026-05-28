import { useRef, useState, useCallback, useEffect } from "react";

export type WhiteboardTool = "pen" | "eraser" | "pan";

export interface Point {
  x: number;
  y: number;
  p?: number; // pressure/velocity simulation
}

export interface Stroke {
  id: string;
  points: Point[];
  tool: "pen";
  color: string;
  width: number;
}

export interface Camera {
  x: number;
  y: number;
  z: number; // zoom
}

export interface UseWhiteboardReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  activeTool: WhiteboardTool;
  setActiveTool: (tool: WhiteboardTool) => void;
  clearAll: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  camera: Camera;
  setCamera: React.Dispatch<React.SetStateAction<Camera>>;
  handlePointerDown: (e: React.PointerEvent) => void;
  handlePointerMove: (e: React.PointerEvent) => void;
  handlePointerUp: (e: React.PointerEvent) => void;
  handleWheel: (e: React.WheelEvent) => void;
  isEmpty: boolean;
  zoomIn: () => void;
  zoomOut: () => void;
}

const STORAGE_KEY = "exam_whiteboard_v1";

export function useWhiteboard(): UseWhiteboardReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const currentStroke = useRef<Stroke | null>(null);
  
  const strokeHistory = useRef<Stroke[]>([]);
  const redoStack = useRef<Stroke[]>([]);
  
  const lastPoint = useRef<Point | null>(null);
  const lastPanPoint = useRef<{ x: number; y: number } | null>(null);

  const [activeTool, setActiveTool] = useState<WhiteboardTool>("pen");
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, z: 1 });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  // Styling
  const penColor = "#e2e8f0"; // slate-200
  const basePenWidth = 2.5;
  const eraserRadius = 20;

  // -- Load / Save --
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        strokeHistory.current = JSON.parse(saved);
        updateHistoryState();
      }
    } catch (e) {
      console.warn("Failed to load whiteboard history", e);
    }
  }, []);

  const saveToLocal = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(strokeHistory.current));
    } catch (e) {
      console.warn("Failed to save whiteboard history", e);
    }
  }, []);

  const updateHistoryState = useCallback(() => {
    setCanUndo(strokeHistory.current.length > 0);
    setCanRedo(redoStack.current.length > 0);
    setIsEmpty(strokeHistory.current.length === 0);
    saveToLocal();
  }, [saveToLocal]);

  // -- Resize & Canvas Sync --
  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform to clear fully
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    for (const stroke of strokeHistory.current) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        const prev = stroke.points[i - 1];
        const curr = stroke.points[i];
        const midX = (prev.x + curr.x) / 2;
        const midY = (prev.y + curr.y) / 2;
        
        // Dynamic width simulation (simplified logic for performance)
        const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y);
        const dynamicWidth = Math.max(stroke.width * 0.5, stroke.width - (dist * 0.05));
        ctx.lineWidth = dynamicWidth;
        
        ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
      }
      ctx.lineTo(stroke.points[stroke.points.length - 1].x, stroke.points[stroke.points.length - 1].y);
      ctx.stroke();
    }
  }, []);

  const updateCanvasTransform = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    
    // Set identity, scale for DPR, then apply camera
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.z, camera.z);
    
    redrawAll();
  }, [camera, redrawAll]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctxRef.current = ctx;
          updateCanvasTransform();
        }
      }
    });

    resizeObserver.observe(parent);
    return () => resizeObserver.disconnect();
  }, [updateCanvasTransform]);

  useEffect(() => {
    updateCanvasTransform();
  }, [camera, updateCanvasTransform]);

  // -- Transforms --
  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    return {
      x: (screenX - camera.x) / camera.z,
      y: (screenY - camera.y) / camera.z,
    };
  }, [camera]);

  // -- Erasing logic --
  const eraseAt = useCallback((worldPoint: Point) => {
    const beforeCount = strokeHistory.current.length;
    // World radius for eraser
    const r = eraserRadius / camera.z;

    strokeHistory.current = strokeHistory.current.filter((stroke) => {
      // Bounding box quick check could be added here for perf, 
      // but for typical exam strokes point distance is fast enough
      return !stroke.points.some(
        (p) => Math.hypot(p.x - worldPoint.x, p.y - worldPoint.y) < r
      );
    });

    if (strokeHistory.current.length !== beforeCount) {
      redoStack.current = []; // Clear redo on new action
      updateHistoryState();
      redrawAll();
    }
  }, [camera.z, redrawAll, updateHistoryState]);

  // -- Pointer Events --
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Middle mouse button or space+drag equivalent (if active tool is pan)
    if (e.button === 1 || activeTool === "pan") {
      isPanning.current = true;
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
      document.body.style.cursor = "grabbing";
      return;
    }

    if (e.button !== 0) return; // Only left click for draw/erase

    const worldPoint = screenToWorld(e.clientX, e.clientY);
    
    if (activeTool === "pen") {
      isDrawing.current = true;
      lastPoint.current = worldPoint;
      currentStroke.current = {
        id: Math.random().toString(36).substr(2, 9),
        points: [worldPoint],
        tool: "pen",
        color: penColor,
        width: basePenWidth / camera.z, // Constant screen width
      };
    } else if (activeTool === "eraser") {
      isDrawing.current = true; // reusing as erasing flag
      eraseAt(worldPoint);
    }
  }, [activeTool, camera.z, screenToWorld, eraseAt]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isPanning.current && lastPanPoint.current) {
      const dx = e.clientX - lastPanPoint.current.x;
      const dy = e.clientY - lastPanPoint.current.y;
      setCamera(c => ({ ...c, x: c.x + dx, y: c.y + dy }));
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (!isDrawing.current) return;
    const worldPoint = screenToWorld(e.clientX, e.clientY);

    if (activeTool === "pen" && currentStroke.current && lastPoint.current) {
      const ctx = ctxRef.current;
      if (!ctx) return;

      currentStroke.current.points.push(worldPoint);
      
      // Draw the new segment immediately
      ctx.beginPath();
      ctx.strokeStyle = currentStroke.current.color;
      ctx.lineWidth = currentStroke.current.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      
      const prev = lastPoint.current;
      const midX = (prev.x + worldPoint.x) / 2;
      const midY = (prev.y + worldPoint.y) / 2;
      
      const dist = Math.hypot(worldPoint.x - prev.x, worldPoint.y - prev.y);
      const dynamicWidth = Math.max(currentStroke.current.width * 0.5, currentStroke.current.width - (dist * 0.05));
      ctx.lineWidth = dynamicWidth;

      ctx.moveTo(prev.x, prev.y);
      ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
      ctx.lineTo(worldPoint.x, worldPoint.y);
      ctx.stroke();

      lastPoint.current = worldPoint;
    } else if (activeTool === "eraser") {
      eraseAt(worldPoint);
    }
  }, [activeTool, screenToWorld, eraseAt]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (isPanning.current) {
      isPanning.current = false;
      lastPanPoint.current = null;
      document.body.style.cursor = "default";
      return;
    }

    if (isDrawing.current && activeTool === "pen" && currentStroke.current) {
      if (currentStroke.current.points.length > 1) {
        strokeHistory.current.push(currentStroke.current);
        redoStack.current = [];
        updateHistoryState();
      }
    }
    
    isDrawing.current = false;
    currentStroke.current = null;
    lastPoint.current = null;
  }, [activeTool, updateHistoryState]);

  // -- Zooming (Wheel) --
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    
    setCamera(c => {
      const newZ = Math.min(Math.max(0.1, c.z * (1 + delta)), 5);
      // To zoom towards cursor, adjust x and y
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { ...c, z: newZ };
      
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      
      const worldX = (screenX - c.x) / c.z;
      const worldY = (screenY - c.y) / c.z;
      
      return {
        x: screenX - worldX * newZ,
        y: screenY - worldY * newZ,
        z: newZ
      };
    });
  }, []);

  // -- Toolbar Actions --
  const undo = useCallback(() => {
    const stroke = strokeHistory.current.pop();
    if (stroke) {
      redoStack.current.push(stroke);
      updateHistoryState();
      redrawAll();
    }
  }, [redrawAll, updateHistoryState]);

  const redo = useCallback(() => {
    const stroke = redoStack.current.pop();
    if (stroke) {
      strokeHistory.current.push(stroke);
      updateHistoryState();
      redrawAll();
    }
  }, [redrawAll, updateHistoryState]);

  const clearAll = useCallback(() => {
    strokeHistory.current = [];
    redoStack.current = [];
    setCamera({ x: 0, y: 0, z: 1 });
    updateHistoryState();
    redrawAll();
  }, [redrawAll, updateHistoryState]);

  const zoomIn = useCallback(() => {
    setCamera(c => {
      const newZ = Math.min(c.z * 1.2, 5);
      // Center zoom
      const canvas = canvasRef.current;
      if (!canvas) return { ...c, z: newZ };
      const cx = canvas.clientWidth / 2;
      const cy = canvas.clientHeight / 2;
      const wx = (cx - c.x) / c.z;
      const wy = (cy - c.y) / c.z;
      return {
        x: cx - wx * newZ,
        y: cy - wy * newZ,
        z: newZ
      };
    });
  }, []);

  const zoomOut = useCallback(() => {
    setCamera(c => {
      const newZ = Math.max(c.z / 1.2, 0.1);
      const canvas = canvasRef.current;
      if (!canvas) return { ...c, z: newZ };
      const cx = canvas.clientWidth / 2;
      const cy = canvas.clientHeight / 2;
      const wx = (cx - c.x) / c.z;
      const wy = (cy - c.y) / c.z;
      return {
        x: cx - wx * newZ,
        y: cy - wy * newZ,
        z: newZ
      };
    });
  }, []);

  return {
    canvasRef,
    activeTool,
    setActiveTool,
    clearAll,
    undo,
    redo,
    canUndo,
    canRedo,
    camera,
    setCamera,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    isEmpty,
    zoomIn,
    zoomOut,
  };
}
