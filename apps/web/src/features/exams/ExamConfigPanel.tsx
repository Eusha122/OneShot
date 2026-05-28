import React, { useState } from "react";
import { CheckCircle, Beaker, Atom, Sigma, Dna, Calculator } from "lucide-react";

export interface ExamConfig {
  subject: string;
  topic: string;
  count: number;
  type: string;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({ subject, topic, count, type });
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-6 text-gray-200">
      <div className="w-full max-w-lg rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-8 shadow-2xl">
        <h2 className="mb-6 text-center font-serif text-2xl font-light text-white tracking-wide">
          Adaptive Exam Engine
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm text-gray-400">Select Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
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
            <label className="mb-2 block text-sm text-gray-400">Specific Topic or Chapter</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isGenerating}
              placeholder="e.g. Newton's Laws, Cell Division, or Full Book"
              className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] p-3 text-sm text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none"
            />
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

          <button
            type="submit"
            disabled={isGenerating || !topic.trim()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-3 font-medium text-black transition-colors hover:bg-amber-400 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                Preparing Challenge...
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
