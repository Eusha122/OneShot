import React, { useState } from "react";
import { ExamConfigPanel, ExamConfig } from "./ExamConfigPanel";
import { ActiveExam, ExamQuestion } from "./ActiveExam";
import { generateExam } from "../../lib/chatApi";

export interface ExamWorkspaceProps {
  learnerId?: number;
  onFinishExam: (score: number, questions: ExamQuestion[], answers: Record<string, string>, evaluations: Record<string, any>) => void;
}

export function ExamWorkspace({ learnerId, onFinishExam }: ExamWorkspaceProps) {
  const [view, setView] = useState<"config" | "active">("config");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState<string>("");
  const [showRetry, setShowRetry] = useState(false);
  const [lastConfig, setLastConfig] = useState<ExamConfig | null>(null);
  const [examData, setExamData] = useState<ExamQuestion[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const handleGenerate = async (config: ExamConfig) => {
    setIsGenerating(true);
    setShowRetry(false);
    setErrorMsg("");
    setLastConfig(config);
    
    // Simulate stages since HTTP POST is atomic
    setGenerationStage("🔍 Searching textbooks...");
    const t1 = setTimeout(() => setGenerationStage("🌐 Enriching with internet..."), 1000);
    const t2 = setTimeout(() => setGenerationStage("🧠 Generating questions..."), 2500);
    
    // 30s timeout for retry button
    const retryTimer = setTimeout(() => {
      setShowRetry(true);
      setGenerationStage("⏳ Still generating... this is taking a while.");
    }, 30000);

    try {
      // Call backend to generate exam
      const questions = await generateExam(config, learnerId);
      
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(retryTimer);
      
      setGenerationStage("✅ Validating exam...");
      setTimeout(() => {
        setExamData(questions);
        setView("active");
        setIsGenerating(false);
        setGenerationStage("");
      }, 500);
      
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(retryTimer);
      console.error("Failed to generate exam", err);
      setErrorMsg(err.message || "Failed to generate exam. Please check backend logs.");
      setIsGenerating(false);
    }
  };

  const handleFinish = (score: number, userAnswers: Record<string, string>, evaluations: Record<string, any>) => {
    onFinishExam(score, examData, userAnswers, evaluations);
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#0f0f0f]">
      {view === "config" ? (
        <div className="relative h-full w-full">
          <ExamConfigPanel onGenerate={handleGenerate} isGenerating={isGenerating} />
          
          {/* Inline Loading Overlay */}
          {isGenerating && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0f0f0f]/90 backdrop-blur-sm">
              <div className="flex flex-col items-center space-y-6">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
                <div className="text-xl font-medium text-amber-500 animate-pulse">
                  {generationStage}
                </div>
                {showRetry && (
                  <button
                    onClick={() => {
                      if (lastConfig) handleGenerate(lastConfig);
                    }}
                    className="mt-8 rounded-lg bg-red-500/20 px-6 py-3 text-red-400 border border-red-500/50 hover:bg-red-500/30 transition-colors"
                  >
                    Generation is slow. Force Retry?
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* Error Message */}
          {!isGenerating && errorMsg && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 rounded-lg bg-red-900/50 p-4 border border-red-500 text-red-200 shadow-xl max-w-md text-center">
              <p className="font-bold mb-2">Generation Error</p>
              <p className="text-sm opacity-80">{errorMsg}</p>
              <button 
                onClick={() => {
                  setErrorMsg("");
                  if (lastConfig) handleGenerate(lastConfig);
                }}
                className="mt-3 text-sm bg-red-500/20 px-4 py-1.5 rounded text-white hover:bg-red-500/40"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      ) : (
        <ActiveExam questions={examData} onFinish={handleFinish} />
      )}
    </div>
  );
}
