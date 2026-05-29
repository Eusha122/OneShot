import React, { useEffect, useRef, useState, useCallback } from "react";
import mermaid from "mermaid";
import { ZoomIn, ZoomOut, Maximize, RotateCcw, Move } from "lucide-react";

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif'
});

const diagram = `
graph TD
    UI[React Frontend]
    API[FastAPI Backend]
    RAG[(ChromaDB RAG)]
    LLM[Ollama Qwen2.5]
    OCR[PaddleOCR]
    Vision[Gemini Vision]
    SQLite[(SQLite State)]

    UI -->|JSON/REST| API
    API -->|Query| RAG
    API -->|Prompt| LLM
    API -->|Image Processing| OCR
    OCR --> Vision
    API -->|Save State| SQLite
    
    style UI fill:#111,stroke:#333,stroke-width:2px,color:#fff
    style API fill:#111,stroke:#f59e0b,stroke-width:2px,color:#fff
    style RAG fill:#064e3b,stroke:#059669,stroke-width:2px,color:#fff
    style LLM fill:#4c1d95,stroke:#8b5cf6,stroke-width:2px,color:#fff
    style OCR fill:#7f1d1d,stroke:#ef4444,stroke-width:2px,color:#fff
    style Vision fill:#1e3a8a,stroke:#3b82f6,stroke-width:2px,color:#fff
    style SQLite fill:#111,stroke:#333,stroke-width:2px,color:#fff
`;

export default function ArchitectureView() {
  const [svgContent, setSvgContent] = useState<string>("");
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.render('mermaid-arch-diagram', diagram).then((result) => {
      setSvgContent(result.svg);
    }).catch(e => console.error("Mermaid rendering failed", e));
  }, []);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.2, 3));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.2, 0.5));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const onMouseUp = () => setIsDragging(false);
  const onMouseLeave = () => setIsDragging(false);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[600px] md:h-[700px] bg-[#0a0a0a] rounded-xl overflow-hidden flex items-center justify-center border border-white/5"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        .mermaid svg {
          width: 100% !important;
          max-width: 900px !important;
          height: auto !important;
        }
        .mermaid .node text {
          font-size: 16px !important;
        }
        .mermaid .edgeLabel {
          font-size: 14px !important;
          padding: 4px !important;
        }
      `}} />
      
      {/* Background Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
      />

      {/* Toolbar */}
      <div className="absolute top-4 right-4 z-10 flex flex-col md:flex-row gap-2 bg-white/5 backdrop-blur-md p-2 rounded-lg border border-white/10 shadow-xl">
        <button onClick={handleZoomIn} className="p-2 hover:bg-white/10 rounded-md transition text-zinc-400 hover:text-white" title="Zoom In"><ZoomIn size={18} /></button>
        <button onClick={handleZoomOut} className="p-2 hover:bg-white/10 rounded-md transition text-zinc-400 hover:text-white" title="Zoom Out"><ZoomOut size={18} /></button>
        <button onClick={handleReset} className="p-2 hover:bg-white/10 rounded-md transition text-zinc-400 hover:text-white" title="Reset View"><RotateCcw size={18} /></button>
        <div className="w-px bg-white/10 my-1 mx-1 hidden md:block"></div>
        <button onClick={toggleFullscreen} className="p-2 hover:bg-white/10 rounded-md transition text-zinc-400 hover:text-white" title="Fullscreen"><Maximize size={18} /></button>
      </div>

      <div className="absolute top-4 left-4 z-10 hidden md:flex items-center gap-2 bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-medium text-zinc-400 shadow-xl">
        <Move size={14} /> Drag to Pan
      </div>

      {/* SVG Container */}
      <div 
        className="mermaid w-full flex justify-center transition-transform duration-75 ease-out" 
        style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}
        dangerouslySetInnerHTML={{ __html: svgContent }} 
      />
    </div>
  );
}
