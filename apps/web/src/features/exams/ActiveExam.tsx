import React, { useState } from "react";
import { Check, X, ArrowRight, Send, Loader2, PlaySquare, PenLine } from "lucide-react";
import { evaluateAnswer } from "../../lib/chatApi";
import { VisualBlockRenderer } from "../visual-blocks/VisualBlockRenderer";
import type { LearningVisualBlock } from "../visual-blocks/visualBlockTypes";
import { WhiteboardPanel } from "./WhiteboardPanel";

export interface ExamQuestion {
  id: string;
  type: "mcq" | "written" | "fill_blank" | "math_numeric" | "math_expression" | "conceptual";
  question: string;
  options?: string[];
  answer: string;
  explanation?: string;
  difficulty?: string;
  source?: string;
}

export interface ActiveExamProps {
  questions: ExamQuestion[];
  onFinish: (score: number, userAnswers: Record<string, string>, evaluations: Record<string, any>) => void;
}

export function ActiveExam({ questions, onFinish }: ActiveExamProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [textInput, setTextInput] = useState<Record<string, string>>({});
  const [evaluating, setEvaluating] = useState<Record<string, boolean>>({});
  const [evaluations, setEvaluations] = useState<Record<string, { correct: boolean, partial_credit: number, reason: string }>>({});
  const [visualizations, setVisualizations] = useState<Record<string, LearningVisualBlock>>({});
  const [isVisualizing, setIsVisualizing] = useState<Record<string, boolean>>({});
  const [vizErrors, setVizErrors] = useState<Record<string, string>>({});
  const [vizRetries, setVizRetries] = useState<Record<string, number>>({});
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [isWhiteboardFullscreen, setIsWhiteboardFullscreen] = useState(false);
  
  // Resizable Split Pane
  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = localStorage.getItem("exam_split_ratio");
    return saved ? parseFloat(saved) : 55;
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeRaf = React.useRef<number | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsResizing(true);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  };

  const handlePointerMove = React.useCallback((e: PointerEvent) => {
    if (!isResizing) return;
    
    if (resizeRaf.current) cancelAnimationFrame(resizeRaf.current);
    
    resizeRaf.current = requestAnimationFrame(() => {
      const percentage = (e.clientX / window.innerWidth) * 100;
      // Clamp between 30% and 70%
      const clamped = Math.max(30, Math.min(70, percentage));
      setLeftWidth(clamped);
    });
  }, [isResizing]);

  const handlePointerUp = React.useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      localStorage.setItem("exam_split_ratio", leftWidth.toString());
    }
  }, [isResizing, leftWidth]);

  React.useEffect(() => {
    if (isResizing) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    }
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      if (resizeRaf.current) cancelAnimationFrame(resizeRaf.current);
    };
  }, [isResizing, handlePointerMove, handlePointerUp]);

  const MAX_VIZ_RETRIES = 2;

  const handleVisualize = async (q: ExamQuestion) => {
    // Dedup: already loading or already loaded
    if (isVisualizing[q.id] || visualizations[q.id]) return;

    // Retry limit
    const retryCount = vizRetries[q.id] || 0;
    if (retryCount >= MAX_VIZ_RETRIES) {
      setVizErrors(prev => ({...prev, [q.id]: "Visualization unavailable for this question."}));
      return;
    }

    setIsVisualizing(prev => ({...prev, [q.id]: true}));
    setVizErrors(prev => { const n = {...prev}; delete n[q.id]; return n; });
    setVizRetries(prev => ({...prev, [q.id]: retryCount + 1}));

    try {
      const res = await fetch("/api/chat/visualize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q.question, context: q.explanation || "" })
      });
      if (res.ok) {
        const data = await res.json();
        setVisualizations(prev => ({...prev, [q.id]: data}));
      } else if (res.status === 404) {
        setVizErrors(prev => ({...prev, [q.id]: "No visualization available for this concept."}));
      } else {
        setVizErrors(prev => ({...prev, [q.id]: "Visualization failed. Try again."}));
      }
    } catch(e) {
      console.error("[Visualize]", e);
      setVizErrors(prev => ({...prev, [q.id]: "Visualization unavailable."}));
    }
    setIsVisualizing(prev => ({...prev, [q.id]: false}));
  };

  const handleOptionSelect = async (qId: string, option: string) => {
    if (answers[qId]) return; // Locked
    setAnswers((prev) => ({ ...prev, [qId]: option }));
    
    // Auto-evaluate MCQ via API
    const q = questions.find(q => q.id === qId);
    if (q) {
      setEvaluating((prev) => ({ ...prev, [qId]: true }));
      try {
        const result = await evaluateAnswer(q.answer, option, q.type);
        setEvaluations((prev) => ({ ...prev, [qId]: result }));
      } catch (err) {
        // Fallback
        const isCorrect = option === q.answer;
        setEvaluations((prev) => ({
          ...prev,
          [qId]: { correct: isCorrect, partial_credit: isCorrect ? 1.0 : 0.0, reason: "" }
        }));
      } finally {
        setEvaluating((prev) => ({ ...prev, [qId]: false }));
      }
    }
  };

  const handleTextSubmit = async (qId: string) => {
    if (answers[qId] || evaluating[qId]) return; // Locked
    const val = textInput[qId] || "";
    if (!val.trim()) return;
    
    setEvaluating((prev) => ({ ...prev, [qId]: true }));
    
    const q = questions.find(q => q.id === qId);
    if (q) {
      try {
        const result = await evaluateAnswer(q.answer, val, q.type);
        setEvaluations((prev) => ({ ...prev, [qId]: result }));
      } catch (err) {
        console.error("Evaluation failed", err);
        // Fallback to basic string match if API fails
        const isCorrect = val.trim().toLowerCase() === q.answer.trim().toLowerCase();
        setEvaluations((prev) => ({
          ...prev,
          [qId]: { correct: isCorrect, partial_credit: isCorrect ? 1.0 : 0.0, reason: "Fallback evaluation" }
        }));
      }
    }
    
    setAnswers((prev) => ({ ...prev, [qId]: val }));
    setEvaluating((prev) => ({ ...prev, [qId]: false }));
  };

  const isComplete = questions.every((q) => answers[q.id] !== undefined);

  const calculateScore = () => {
    let score = 0;
    questions.forEach((q) => {
      const evalResult = evaluations[q.id];
      if (evalResult) {
        score += evalResult.partial_credit;
      }
    });
    return score;
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-black relative">
      {/* Left Pane: Exam Questions */}
      <div 
        className="flex flex-col h-full overflow-y-auto p-6 transition-all"
        style={{ 
          width: showWhiteboard ? `${leftWidth}%` : '100%',
          transition: isResizing ? 'none' : 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <div className="mx-auto w-full max-w-3xl space-y-8 pb-32">
          <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-4">
            <h2 className="font-serif text-2xl font-light text-white">Active Exam</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">
                {Object.keys(answers).length} / {questions.length} Answered
              </span>
              {!showWhiteboard && (
                <button 
                  onClick={() => setShowWhiteboard(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#222] border border-[#333] hover:bg-[#333] transition-colors text-gray-300 text-sm font-medium"
                >
                  <PenLine size={14} />
                  Expand Whiteboard
                </button>
              )}
            </div>
          </div>

          {questions.map((q, index) => {
          const userAnswer = answers[q.id];
          const isAnswered = userAnswer !== undefined;
          const isEvaluating = evaluating[q.id];
          const evalResult = evaluations[q.id];
          
          const isCorrect = evalResult?.correct || false;
          const isPartial = !isCorrect && (evalResult?.partial_credit || 0) > 0;

          return (
            <div
              key={q.id}
              className={`rounded-xl border p-6 transition-colors ${
                isAnswered && !isEvaluating
                  ? isCorrect
                    ? "border-green-900/50 bg-green-900/10"
                    : isPartial
                    ? "border-amber-900/50 bg-amber-900/10"
                    : "border-red-900/50 bg-red-900/10"
                  : "border-[#2a2a2a] bg-[#1a1a1a]"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg text-white flex-1">
                  <span className="mr-3 text-amber-500">{index + 1}.</span>
                  {q.question}
                </h3>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {(q as any).chapter && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    📖 {(q as any).chapter}
                  </span>
                )}
                {(q as any).difficulty && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    (q as any).difficulty === 'easy' ? 'bg-green-500/15 text-green-300 border-green-500/30' :
                    (q as any).difficulty === 'hard' ? 'bg-red-500/15 text-red-300 border-red-500/30' :
                    'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}>
                    {(q as any).difficulty === 'easy' ? '🟢' : (q as any).difficulty === 'hard' ? '🔴' : '🟡'} {(q as any).difficulty}
                  </span>
                )}
                {q.source && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${q.source === 'rag' ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'}`}>
                    {q.source === 'rag' ? '📘 Curriculum' : '🌐 Web'}
                  </span>
                )}
              </div>

              {q.type === "mcq" && q.options && (
                <div className="space-y-3">
                  {q.options.map((opt) => {
                    const isSelected = userAnswer === opt;
                    const showCorrect = isAnswered && opt === q.answer;
                    const showWrong = isSelected && !isCorrect;

                    return (
                      <button
                        key={opt}
                        onClick={() => handleOptionSelect(q.id, opt)}
                        disabled={isAnswered}
                        className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors ${
                          showCorrect
                            ? "border-green-500 bg-green-500/20 text-green-300"
                            : showWrong
                            ? "border-red-500 bg-red-500/20 text-red-300"
                            : isSelected
                            ? "border-amber-500 bg-amber-500/10 text-amber-500"
                            : "border-[#333] bg-[#0a0a0a] text-gray-300 hover:border-gray-500"
                        } ${isAnswered && !isSelected && !showCorrect ? "opacity-50" : ""}`}
                      >
                        <span>{opt}</span>
                        {showCorrect && <Check size={18} className="text-green-500" />}
                        {showWrong && <X size={18} className="text-red-500" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {(q.type === "written" || q.type === "fill_blank" || q.type === "math_numeric" || q.type === "math_expression" || q.type === "conceptual") && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={isAnswered ? userAnswer : textInput[q.id] || ""}
                    onChange={(e) =>
                      setTextInput((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                    disabled={isAnswered || isEvaluating}
                    placeholder="Type your short answer here..."
                    className={`w-full flex-1 rounded-lg border p-4 focus:outline-none ${
                      isAnswered && !isEvaluating
                        ? isCorrect
                          ? "border-green-500 bg-green-500/10 text-green-300"
                          : isPartial
                          ? "border-amber-500 bg-amber-500/10 text-amber-300"
                          : "border-red-500 bg-red-500/10 text-red-300"
                        : "border-[#333] bg-[#0a0a0a] text-white focus:border-amber-500"
                    }`}
                  />
                  {!isAnswered && !isEvaluating && (
                    <button
                      onClick={() => handleTextSubmit(q.id)}
                      disabled={!(textInput[q.id] || "").trim()}
                      className="flex items-center justify-center rounded-lg bg-amber-500 px-6 text-black hover:bg-amber-400 disabled:opacity-50"
                    >
                      <Send size={18} />
                    </button>
                  )}
                  {isEvaluating && (
                    <div className="flex items-center justify-center rounded-lg px-4 text-amber-500">
                      <Loader2 size={24} className="animate-spin" />
                    </div>
                  )}
                  {isAnswered && !isEvaluating && evalResult && (
                    <div className="flex items-center justify-center rounded-lg px-4">
                      {isCorrect ? (
                        <Check size={24} className="text-green-500" />
                      ) : isPartial ? (
                        <span className="text-amber-500 font-bold whitespace-nowrap px-2">Partial</span>
                      ) : (
                        <X size={24} className="text-red-500" />
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {isAnswered && !isEvaluating && evalResult && (evalResult.reason || !isCorrect || q.type === "math_numeric" || q.type === "math_expression" || q.type === "mcq") && (
                <div className={`mt-4 p-4 rounded-xl border flex flex-col gap-3 ${isCorrect ? 'bg-green-500/5 border-green-500/20 text-green-400' : isPartial ? 'bg-amber-500/5 border-amber-500/20 text-amber-400' : 'bg-red-500/5 border-red-500/20 text-red-400'}`}>
                  {isCorrect && (q.type === "math_numeric" || q.type === "math_expression" || q.type === "mcq") && (
                    <div className="font-bold flex items-center gap-2">
                      <Check size={16} /> Correct
                    </div>
                  )}
                  {!isCorrect && (q.type === "math_numeric" || q.type === "math_expression" || q.type === "mcq") && (
                    <div className="font-bold text-white flex items-center gap-2">
                      Expected: <span className="px-2 py-1 bg-black/30 rounded border border-white/10">{q.answer}</span>
                    </div>
                  )}
                  {evalResult.reason && (
                    <div className="text-sm"><strong>AI Evaluation:</strong> {evalResult.reason}</div>
                  )}
                  {!isCorrect && q.explanation && (
                    <div className="text-sm text-gray-300">
                      <strong>Explanation:</strong> {q.explanation}
                    </div>
                  )}
                  
                  {/* Dynamic Interactive Visual Learning Block */}
                  {!isCorrect && (
                    <div className="mt-2 flex flex-col gap-3">
                      {visualizations[q.id] ? (
                        <div className="w-full">
                          <VisualBlockRenderer block={visualizations[q.id]} />
                        </div>
                      ) : vizErrors[q.id] ? (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-amber-400 text-sm">
                          <span>⚠</span> {vizErrors[q.id]}
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleVisualize(q)}
                          disabled={isVisualizing[q.id]}
                          className="self-start flex items-center gap-2 px-4 py-2 rounded-lg bg-[#222] border border-[#444] text-cyan-400 hover:bg-[#333] transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          {isVisualizing[q.id] ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Generating Visualization...
                            </>
                          ) : (
                            <>
                              <PlaySquare size={16} />
                              Visualize Problem
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isComplete && (
        <div 
          className="fixed bottom-0 left-64 flex justify-center border-t border-[#2a2a2a] bg-[#0f0f0f]/80 p-6 backdrop-blur-md z-20 transition-all duration-300"
          style={{ right: showWhiteboard ? `${100 - leftWidth}%` : 0 }}
        >
          <button
            onClick={() => onFinish(calculateScore(), answers, evaluations)}
            className="flex w-full max-w-sm items-center justify-center gap-2 rounded-lg bg-amber-500 py-3 font-medium text-black transition-colors hover:bg-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
          >
            View Result & Ask AI
            <ArrowRight size={18} />
          </button>
        </div>
      )}
      </div>

      {/* Resize Divider */}
      {showWhiteboard && (
        <div 
          onPointerDown={handlePointerDown}
          onDoubleClick={() => setLeftWidth(leftWidth > 45 && leftWidth < 55 ? 30 : 50)}
          className="relative z-30 w-1 bg-[#1a1a1a] hover:bg-cyan-500 cursor-col-resize flex-shrink-0 transition-colors duration-150 group"
        >
          {/* Invisible larger hit area */}
          <div className="absolute -left-2 -right-2 top-0 bottom-0" />
          {/* Subtle glow on hover */}
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-cyan-500 opacity-0 group-hover:opacity-100 shadow-[0_0_8px_rgba(6,182,212,0.8)] transition-opacity" />
        </div>
      )}

      {/* Right Pane: Whiteboard */}
      {showWhiteboard && (
        <div 
          className="h-full bg-[#050505] p-3 flex flex-col relative z-10 shadow-[-20px_0_40px_rgba(0,0,0,0.6)] transition-all"
          style={{ 
            width: `${100 - leftWidth}%`,
            transition: isResizing ? 'none' : 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <WhiteboardPanel 
            onClose={() => setShowWhiteboard(false)} 
            isFullscreen={isWhiteboardFullscreen}
            onToggleFullscreen={() => setIsWhiteboardFullscreen(!isWhiteboardFullscreen)}
          />
        </div>
      )}
    </div>
  );
}
