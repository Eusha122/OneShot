import React, { useState, useEffect } from "react";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { SSC_CLASS_9_TOPICS } from "./curriculumTopics";
import { getInferenceStatus } from "../../lib/chatApi";

export interface ExamConfig {
  subject: string;
  topic: string;
  count: number;
  type: string;
  board: string;
  class_name: string;
  weak_topics: string[];
}

interface ExamConfigPanelProps {
  onGenerate: (config: ExamConfig) => void;
  isGenerating: boolean;
}

export function ExamConfigPanel({ onGenerate, isGenerating }: ExamConfigPanelProps) {
  const [subject, setSubject] = useState("Physics");
  const [topic, setTopic] = useState("Full Book");
  const [count, setCount] = useState(5);
  const [type, setType] = useState("mcq");

  // Read profile from localStorage
  const [board, setBoard] = useState("SSC");
  const [className, setClassName] = useState("Class 9");
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  
  const [inferenceStatus, setInferenceStatus] = useState<"healthy" | "degraded" | "checking">("checking");
  const [inferenceError, setInferenceError] = useState("");

  useEffect(() => {
    try {
      const profile = localStorage.getItem("oneshot_profile");
      if (profile) {
        const p = JSON.parse(profile);
        if (p.board) setBoard(p.board);
        if (p.grade) setClassName(p.grade);
        if (p.weak_topics) setWeakTopics(p.weak_topics);
      }
    } catch {}
    
    // Check inference health
    getInferenceStatus()
      .then((res) => {
        // Healthy if any active backend is up: local Ollama OR cloud AI
        const isHealthy = res.ollama === "healthy" || res.cloud === "healthy";
        if (isHealthy) {
          setInferenceStatus("healthy");
        } else {
          setInferenceStatus("degraded");
          setInferenceError(res.error || res.cloud_error || res.ollama_error || "Inference service unavailable");
        }
      })
      .catch(() => {
        setInferenceStatus("degraded");
        setInferenceError("Could not reach backend to check AI health.");
      });
  }, []);

  // Get topic suggestions based on selected subject
  const topicSuggestions = SSC_CLASS_9_TOPICS[subject] || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({ subject, topic, count, type, board, class_name: className, weak_topics: weakTopics });
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-6 text-gray-200">
      <div className="w-full max-w-lg rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-8 shadow-2xl">
        <h2 className="mb-2 text-center font-serif text-2xl font-light text-white tracking-wide">
          Adaptive Exam Engine
        </h2>
        <p className="mb-6 text-center text-xs text-gray-500">
          {board} · {className}
        </p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm text-gray-400">Select Subject</label>
            <select
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setTopic("Full Book");
              }}
              disabled={isGenerating}
              className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] p-3 text-sm text-white focus:border-amber-500 focus:outline-none"
            >
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Biology">Biology</option>
              <option value="Math">Math</option>
              <option value="Higher Math">Higher Math</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-400">Chapter / Topic</label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isGenerating}
              className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] p-3 text-sm text-white focus:border-amber-500 focus:outline-none"
            >
              <option value="Full Book">📚 Full Book (All Chapters)</option>
              {topicSuggestions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-2 block text-sm text-gray-400">Question Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={isGenerating}
                className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] p-3 text-sm text-white focus:border-amber-500 focus:outline-none"
              >
                <option value="mcq">Multiple Choice (MCQ)</option>
                <option value="math_numeric">Numeric Math</option>
                <option value="math_expression">Symbolic Math</option>
                <option value="conceptual">Conceptual Theory</option>
                <option value="written">Written Answer</option>
                <option value="fill_blank">Fill in the Blanks</option>
              </select>
            </div>
            <div className="w-1/3">
              <label className="mb-2 block text-sm text-gray-400">Questions</label>
              <input
                type="number"
                min="1"
                max="20"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 5)}
                disabled={isGenerating}
                className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] p-3 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {weakTopics.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="text-xs text-amber-400 mb-1">🎯 Weak areas detected (will be prioritized):</p>
              <div className="flex flex-wrap gap-1.5">
                {weakTopics.map((t) => (
                  <span key={t} className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs text-amber-300 border border-amber-500/30">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {inferenceStatus === "degraded" && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 flex items-start gap-3">
              <AlertTriangle className="text-red-400 mt-0.5 flex-shrink-0" size={18} />
              <div>
                <p className="text-sm font-medium text-red-400">AI Inference Unavailable</p>
                <p className="text-xs text-red-400/80 mt-1">{inferenceError}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isGenerating || !topic.trim() || inferenceStatus === "degraded" || inferenceStatus === "checking"}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-3 font-medium text-black transition-colors hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                Preparing Challenge...
              </>
            ) : inferenceStatus === "checking" ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                Checking AI Health...
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                Prepare Challenge
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
