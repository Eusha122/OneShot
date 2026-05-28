import React, { useState } from "react";
import { Check, X, ArrowRight, Send, Loader2 } from "lucide-react";
import { evaluateAnswer } from "../../lib/chatApi";

export interface ExamQuestion {
  id: string;
  type: "mcq" | "written" | "fill_blank";
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

  const handleOptionSelect = (qId: string, option: string) => {
    if (answers[qId]) return; // Locked
    setAnswers((prev) => ({ ...prev, [qId]: option }));
    
    // Auto-evaluate MCQ
    const q = questions.find(q => q.id === qId);
    if (q) {
      const isCorrect = option === q.answer;
      setEvaluations((prev) => ({
        ...prev,
        [qId]: { correct: isCorrect, partial_credit: isCorrect ? 1.0 : 0.0, reason: isCorrect ? "Correct" : "Incorrect" }
      }));
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
        const result = await evaluateAnswer(q.answer, val);
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
    <div className="flex h-full w-full flex-col p-6 text-gray-200 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl space-y-8 pb-32">
        <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-4">
          <h2 className="font-serif text-2xl font-light text-white">Active Exam</h2>
          <span className="text-sm text-gray-400">
            {Object.keys(answers).length} / {questions.length} Answered
          </span>
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
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg text-white">
                  <span className="mr-3 text-amber-500">{index + 1}.</span>
                  {q.question}
                </h3>
                {q.source && (
                  <span className={`text-xs px-2 py-1 rounded-full ${q.source === 'rag' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'}`}>
                    {q.source === 'rag' ? 'Curriculum' : 'Web Enriched'}
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

              {(q.type === "written" || q.type === "fill_blank") && (
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
              
              {isAnswered && !isEvaluating && evalResult && evalResult.reason && (
                <div className={`mt-4 p-3 rounded-md text-sm ${isCorrect ? 'bg-green-500/10 text-green-400' : isPartial ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                  <strong>AI Evaluation:</strong> {evalResult.reason}
                  {!isCorrect && q.explanation && (
                    <div className="mt-2 text-gray-300">
                      <strong>Expected Answer Context:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isComplete && (
        <div className="fixed bottom-0 left-64 right-0 flex justify-center border-t border-[#2a2a2a] bg-[#0f0f0f]/80 p-6 backdrop-blur-md">
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
  );
}
