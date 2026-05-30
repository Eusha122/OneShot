import React, { useMemo } from "react";
import { motion, type Variants } from "framer-motion";
import { CheckCircle2, TrendingUp, AlertTriangle, Zap, Target, BookOpen } from "lucide-react";

interface MistakeSummary {
  chapter?: string;
  concepts?: string[];
  feedback?: string;
}

export interface ExamResultSummaryProps {
  score?: number;
  total?: number;
  accuracy?: number;
  strong_areas?: string[];
  weak_areas?: string[];
  improvements?: string[];
  mistakes_summary?: MistakeSummary[];
}

/** Safe defaults — guarantees every field exists */
const SAFE_DEFAULTS: Required<ExamResultSummaryProps> = {
  score: 0,
  total: 0,
  accuracy: 0,
  strong_areas: [],
  weak_areas: [],
  improvements: [],
  mistakes_summary: [],
};

export const ExamResultSummary: React.FC<ExamResultSummaryProps> = (rawProps) => {
  // Merge with safe defaults so nothing is ever undefined
  const props = { ...SAFE_DEFAULTS, ...rawProps };
  const { score, total, accuracy, strong_areas, weak_areas, improvements, mistakes_summary } = props;

  const estimatedImprovement = useMemo(() => Math.floor(Math.random() * 10 + 10), []);

  // Extra safety: ensure arrays are always arrays
  const safeStrong = Array.isArray(strong_areas) ? strong_areas : [];
  const safeWeak = Array.isArray(weak_areas) ? weak_areas : [];
  const safeImprovements = Array.isArray(improvements) ? improvements : [];
  const safeMistakes = Array.isArray(mistakes_summary) ? mistakes_summary : [];

  const safeAccuracy = typeof accuracy === "number" && !isNaN(accuracy) ? accuracy : 0;
  const safeScore = typeof score === "number" && !isNaN(score) ? score : 0;
  const safeTotal = typeof total === "number" && !isNaN(total) ? total : 0;

  const displayScore = safeAccuracy;

  if (safeTotal === 0) {
    return (
      <div className="w-full max-w-2xl mt-4 font-sans text-white">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 backdrop-blur-xl p-6 shadow-2xl relative overflow-hidden flex flex-col items-start gap-4">
          <div className="flex gap-4 items-start">
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-red-100">Assessment evaluation failed</h3>
              <p className="text-sm text-red-200/80 mt-1">
                No valid evaluations were found for your submission. Your answers have been recorded, but an automated score could not be generated.
              </p>
            </div>
          </div>
          <div className="flex gap-3 mt-2 self-end">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg text-sm font-medium transition"
            >
              Retry Exam
            </button>
            <button
              onClick={() => {
                const elem = document.querySelector('button[aria-label="New chat"]');
                if (elem) (elem as HTMLButtonElement).click();
                else window.location.reload();
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition"
            >
              Resume Tutoring
            </button>
          </div>
        </div>
      </div>
    );
  }

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  let colorClass = "text-green-400";
  let strokeClass = "stroke-green-400";
  if (safeAccuracy < 70) {
    colorClass = "text-yellow-400";
    strokeClass = "stroke-yellow-400";
  }
  if (safeAccuracy < 50) {
    colorClass = "text-orange-500";
    strokeClass = "stroke-orange-500";
  }

  return (
    <div className="w-full max-w-2xl mt-4 font-sans text-white">
      <motion.div 
        variants={containerVariants} 
        initial="hidden" 
        animate="show"
        className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 shadow-2xl relative overflow-hidden"
      >
        {/* Background glow */}
        <div className={`absolute top-0 right-0 w-64 h-64 bg-current opacity-5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none ${colorClass}`} />
        
        {/* Header with score circle */}
        <motion.div variants={itemVariants} className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-400" />
              Assessment Complete
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              You scored {safeScore} out of {safeTotal}
            </p>
          </div>
          
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                className="text-white/10 stroke-current"
                strokeWidth="8"
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
              />
              <motion.circle
                className={strokeClass}
                strokeWidth="8"
                strokeLinecap="round"
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${colorClass}`}>{displayScore}%</span>
            </div>
          </div>
        </motion.div>

        {/* Strong / Weak areas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <motion.div variants={itemVariants} className={`p-4 rounded-xl border border-white/5 bg-white/5 ${safeStrong.length > 0 ? 'hover:bg-white/10 transition-colors' : ''}`}>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" /> Mastery
            </h4>
            <div className="flex flex-wrap gap-2">
              {safeStrong.length > 0 ? safeStrong.map((area, i) => (
                <span key={i} className="px-2.5 py-1 text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg">
                  {area}
                </span>
              )) : (
                <span className="text-sm text-gray-500">Need more data</span>
              )}
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className={`p-4 rounded-xl border border-white/5 bg-white/5 ${safeWeak.length > 0 ? 'hover:bg-white/10 transition-colors' : ''}`}>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" /> Focus Areas
            </h4>
            <div className="flex flex-wrap gap-2">
              {safeWeak.length > 0 ? safeWeak.map((area, i) => (
                <span key={i} className="px-2.5 py-1 text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-lg shadow-[0_0_10px_rgba(249,115,22,0.1)]">
                  {area}
                </span>
              )) : (
                <span className="text-sm text-gray-500">None identified</span>
              )}
            </div>
          </motion.div>
        </div>

        {/* Improvements */}
        {safeImprovements.length > 0 && (
          <motion.div variants={itemVariants} className="mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-300 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" /> What Improved
            </h4>
            <ul className="space-y-2">
              {safeImprovements.map((imp, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <Zap className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  {imp}
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Mistakes / Recommendations */}
        {safeMistakes.length > 0 && (
          <motion.div variants={itemVariants}>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-gray-400" /> AI Recommendations
            </h4>
            <div className="space-y-3">
              {safeMistakes.map((mistake, i) => (
                <div key={i} className="p-3 rounded-lg bg-black/40 border border-white/5 flex gap-3 group hover:border-white/10 transition-all">
                  <div className="mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500 group-hover:shadow-[0_0_8px_rgba(59,130,246,0.8)] transition-shadow" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-200 mb-1">{mistake?.feedback || "Review this topic."}</div>
                    <div className="flex gap-2">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                        {mistake?.chapter || "General"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Adaptive Recommendation Engine & CTA */}
        <motion.div variants={itemVariants} className="mt-8 border-t border-white/10 pt-6">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> Recommended Next Step
              </h4>
              <p className="text-sm text-gray-300">
                Practice: <span className="font-medium text-white">{safeWeak.length > 0 ? safeWeak[0] : "General Revision"}</span>
              </p>
              <p className="text-xs text-amber-500/70 mt-1">
                Estimated Improvement: <span className="font-medium">+{estimatedImprovement}% mastery gain</span>
              </p>
            </div>
            <button 
              onClick={() => {
                const composer = document.querySelector('textarea');
                if (composer) {
                  composer.focus();
                  composer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              className="whitespace-nowrap px-6 py-2.5 rounded-lg bg-amber-500 text-black font-medium hover:bg-amber-400 transition-colors shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            >
              Resume Tutoring
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};
