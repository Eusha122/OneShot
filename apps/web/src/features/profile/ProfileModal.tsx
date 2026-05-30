import React, { useState } from "react";
import { X, Save, User } from "lucide-react";

export interface LearnerProfile {
  display_name: string;
  grade: string;
  board: string;
  language_preference: string;
  subjects_of_interest: string[];
  weak_topics: string[];
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  learnerId: number | null;
}

const DEFAULT_PROFILE: LearnerProfile = {
  display_name: "",
  grade: "Class 9",
  board: "SSC",
  language_preference: "en",
  subjects_of_interest: [],
  weak_topics: [],
};

const AVAILABLE_SUBJECTS = ["Physics", "Math", "Chemistry", "Biology", "Higher Math"];
const AVAILABLE_BOARDS = ["SSC", "HSC", "Cambridge", "Edexcel"];
const AVAILABLE_GRADES = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];

function loadStoredProfile(): LearnerProfile {
  try {
    const stored = localStorage.getItem("oneshot_profile");
    return stored ? { ...DEFAULT_PROFILE, ...JSON.parse(stored) } : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const [profile, setProfile] = useState<LearnerProfile>(() => loadStoredProfile());
  const [weakTopicInput, setWeakTopicInput] = useState("");
  const [saved, setSaved] = useState(false);

  const toggleSubject = (s: string) => {
    setProfile((prev) => ({
      ...prev,
      subjects_of_interest: prev.subjects_of_interest.includes(s)
        ? prev.subjects_of_interest.filter((x) => x !== s)
        : [...prev.subjects_of_interest, s],
    }));
  };

  const addWeakTopic = () => {
    const topic = weakTopicInput.trim();
    if (topic && !profile.weak_topics.includes(topic)) {
      setProfile((prev) => ({
        ...prev,
        weak_topics: [...prev.weak_topics, topic],
      }));
      setWeakTopicInput("");
    }
  };

  const removeWeakTopic = (topic: string) => {
    setProfile((prev) => ({
      ...prev,
      weak_topics: prev.weak_topics.filter((t) => t !== topic),
    }));
  };

  const handleSave = () => {
    localStorage.setItem("oneshot_profile", JSON.stringify(profile));
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[#2a2a2a] bg-[#141414] p-6 shadow-2xl mx-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
              <User size={20} className="text-amber-400" />
            </div>
            <h2 className="font-serif text-xl text-white">Student Profile</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-xs text-gray-500 uppercase tracking-wider">Name</label>
            <input
              type="text"
              value={profile.display_name}
              onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))}
              placeholder="Your name"
              className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] p-2.5 text-sm text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Board & Class */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-gray-500 uppercase tracking-wider">Board</label>
              <select
                value={profile.board}
                onChange={(e) => setProfile((p) => ({ ...p, board: e.target.value }))}
                className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] p-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
              >
                {AVAILABLE_BOARDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-gray-500 uppercase tracking-wider">Class</label>
              <select
                value={profile.grade}
                onChange={(e) => setProfile((p) => ({ ...p, grade: e.target.value }))}
                className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] p-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
              >
                {AVAILABLE_GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Subjects */}
          <div>
            <label className="mb-1.5 block text-xs text-gray-500 uppercase tracking-wider">Subjects of Interest</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SUBJECTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSubject(s)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                    profile.subjects_of_interest.includes(s)
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                      : "bg-[#1a1a1a] text-gray-400 border-[#333] hover:border-gray-500"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Weak Topics */}
          <div>
            <label className="mb-1.5 block text-xs text-gray-500 uppercase tracking-wider">
              Weak Topics <span className="text-gray-600">(AI will prioritize these)</span>
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={weakTopicInput}
                onChange={(e) => setWeakTopicInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addWeakTopic();
                  }
                }}
                placeholder="e.g. Linear Equations, Trigonometry"
                className="flex-1 rounded-lg border border-[#333] bg-[#0a0a0a] p-2.5 text-sm text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={addWeakTopic}
                className="rounded-lg bg-[#222] px-3 text-sm text-amber-400 border border-[#333] hover:bg-[#2a2a2a]"
              >
                Add
              </button>
            </div>
            {profile.weak_topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {profile.weak_topics.map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-xs text-red-300 border border-red-500/30"
                  >
                    {t}
                    <button onClick={() => removeWeakTopic(t)} className="ml-0.5 hover:text-white">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className={`mt-6 flex w-full items-center justify-center gap-2 rounded-lg py-3 font-medium transition-all ${
            saved
              ? "bg-green-500 text-black"
              : "bg-amber-500 text-black hover:bg-amber-400"
          }`}
        >
          {saved ? (
            <>✅ Saved!</>
          ) : (
            <>
              <Save size={16} />
              Save Profile
            </>
          )}
        </button>
      </div>
    </div>
  );
}
