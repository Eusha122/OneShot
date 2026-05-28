import React, { useEffect } from "react";
import { Pen, Eraser, Trash2, Undo, Redo, ZoomIn, ZoomOut, Hand, Maximize, Minimize } from "lucide-react";
import { useWhiteboard } from "./useWhiteboard";

export interface WhiteboardPanelProps {
  onClose?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const WhiteboardPanel: React.FC<WhiteboardPanelProps> = ({ 
  onClose, 
  isFullscreen, 
  onToggleFullscreen 
}) => {
  const {
    canvasRef,
    activeTool,
    setActiveTool,
    clearAll,
    undo,
    redo,
    canUndo,
    canRedo,
    camera,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    isEmpty,
    zoomIn,
    zoomOut,
  } = useWhiteboard();

  // Pattern offset based on camera
  const bgSize = 24 * camera.z;
  const bgX = camera.x % bgSize;
  const bgY = camera.y % bgSize;

  return (
    <div className={`flex flex-col bg-[#0a0a0a] border border-[#222] overflow-hidden relative shadow-2xl transition-all duration-300 ${
      isFullscreen ? 'fixed inset-4 z-50 rounded-2xl' : 'h-full w-full rounded-xl'
    }`}>
      {/* Dynamic Dot Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.12] transition-transform" 
        style={{
          backgroundImage: `radial-gradient(circle at ${bgX}px ${bgY}px, #e2e8f0 ${1.5 * camera.z}px, transparent 0)`,
          backgroundSize: `${bgSize}px ${bgSize}px`
        }} 
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#222] bg-[#050505]/80 backdrop-blur px-5 py-3 z-10">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
          Workspace
        </h3>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-600 font-mono">
            {Math.round(camera.z * 100)}%
          </span>
          {onToggleFullscreen && (
            <button 
              onClick={onToggleFullscreen}
              className="text-gray-500 hover:text-gray-300 transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Workspace"}
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
          )}
          {onClose && (
            <button 
              onClick={onClose}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative flex-1 w-full h-full overflow-hidden touch-none"
           style={{ cursor: activeTool === "pan" ? "grab" : "crosshair" }}>
        
        {/* Empty State Text */}
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-500/50 font-serif text-xl tracking-wide select-none">
              Use the workspace to solve visually
            </p>
          </div>
        )}

        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerOut={handlePointerUp}
          onWheel={handleWheel}
          className="absolute inset-0 w-full h-full touch-none"
        />
      </div>

      {/* Glassmorphic Floating Toolbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-white/10 bg-[#111111]/80 backdrop-blur-xl p-2 shadow-2xl z-10 shadow-black/50">
        
        <button
          onClick={() => setActiveTool("pen")}
          className={`rounded-full p-2.5 transition-all duration-200 ${
            activeTool === "pen" 
              ? "bg-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]" 
              : "text-gray-400 hover:bg-white/10 hover:text-white"
          }`}
          title="Pen"
        >
          <Pen size={18} />
        </button>
        
        <button
          onClick={() => setActiveTool("eraser")}
          className={`rounded-full p-2.5 transition-all duration-200 ${
            activeTool === "eraser" 
              ? "bg-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]" 
              : "text-gray-400 hover:bg-white/10 hover:text-white"
          }`}
          title="Eraser"
        >
          <Eraser size={18} />
        </button>

        <button
          onClick={() => setActiveTool("pan")}
          className={`rounded-full p-2.5 transition-all duration-200 ${
            activeTool === "pan" 
              ? "bg-purple-500/20 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]" 
              : "text-gray-400 hover:bg-white/10 hover:text-white"
          }`}
          title="Pan (Middle Click or Space)"
        >
          <Hand size={18} />
        </button>

        <div className="w-px h-6 bg-white/10 mx-1" />

        <button
          onClick={undo}
          disabled={!canUndo}
          className="rounded-full p-2.5 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Undo"
        >
          <Undo size={18} />
        </button>

        <button
          onClick={redo}
          disabled={!canRedo}
          className="rounded-full p-2.5 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Redo"
        >
          <Redo size={18} />
        </button>

        <div className="w-px h-6 bg-white/10 mx-1" />

        <button
          onClick={zoomOut}
          className="rounded-full p-2.5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={18} />
        </button>

        <button
          onClick={zoomIn}
          className="rounded-full p-2.5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={18} />
        </button>

        <div className="w-px h-6 bg-white/10 mx-1" />
        
        <button
          onClick={() => {
            if (window.confirm("Clear entire whiteboard?")) {
              clearAll();
            }
          }}
          className="rounded-full p-2.5 text-gray-400 hover:bg-red-500/15 hover:text-red-400 transition-colors"
          title="Clear All"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};
