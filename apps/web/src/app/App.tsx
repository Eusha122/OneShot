import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Atom, CheckCircle, ChevronRight, Loader, Menu, Mic, Paperclip, Camera, PenTool, Plus, Search, Settings, Sigma, Upload, X, BarChart2 } from "lucide-react";
import { AssistantMarkdown } from "../features/chat/AssistantMarkdown";
import { VisualBlockRenderer } from "../features/visual-blocks/VisualBlockRenderer";
import type { LearningVisualBlock } from "../features/visual-blocks/visualBlockTypes";
import { getConversation, getConversations, getDocumentStatus, sendChatMessage, uploadDocument, LearningMode, SubjectType, Conversation } from "../lib/chatApi";
import { ProfileModal } from "../features/profile/ProfileModal";
import { AttachmentMenu } from "../components/chat/AttachmentMenu";

type LearningMode =
  | "explain_simply"
  | "exam_mode"
  | "visual_mode"
  | "step_by_step"
  | "fast_revision"
  | "challenge_me";

export interface ActiveDocument {
  id: number;
  filename: string;
  status: "uploading" | "processing" | "ready" | "failed";
  uploadedAt: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: LearningMode;
  visualBlocks?: LearningVisualBlock[];
  attachments?: ActiveDocument[];
}

import { ExamWorkspace } from "../features/exams/ExamWorkspace";
import { AnalyticsDashboard } from "../features/dashboard/AnalyticsDashboard";

const modes: { id: LearningMode; label: string }[] = [
  { id: "explain_simply", label: "Explain Simply" },
  { id: "exam_mode", label: "Exam Mode" },
  { id: "visual_mode", label: "Visual Mode" },
  { id: "step_by_step", label: "Step-by-Step" },
  { id: "fast_revision", label: "Fast Revision" },
  { id: "challenge_me", label: "Challenge Me" },
];

export function App() {
  const [activeView, setActiveView] = useState<"chat" | "whiteboard" | "exams" | "dashboard">("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedMode, setSelectedMode] = useState<LearningMode>("visual_mode");
  const [selectedSubject, setSelectedSubject] = useState<SubjectType>(() => {
    return (localStorage.getItem("oneshot_selected_subject") as SubjectType) || "auto";
  });
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [learnerId, setLearnerId] = useState<number | null>(() => {
    const stored = localStorage.getItem("oneshot_learner_id");
    const parsed = stored ? parseInt(stored, 10) : NaN;
    return !isNaN(parsed) ? parsed : null;
  });
  const [conversationsList, setConversationsList] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(() => {
    const storedConv = localStorage.getItem("oneshot_active_conversation_id");
    const parsed = storedConv ? parseInt(storedConv, 10) : NaN;
    return !isNaN(parsed) ? parsed : null;
  });
  const skipFetchRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isGeneratingRef = useRef(false);
  const mainScrollRef = useRef<HTMLElement | null>(null);

  const [activeDocuments, setActiveDocuments] = useState<ActiveDocument[]>(() => {
    const stored = localStorage.getItem(`oneshot_docs_${activeConversationId || "new"}`);
    return stored ? JSON.parse(stored) : [];
  });
  const activeDocumentsRef = useRef<ActiveDocument[]>(activeDocuments);

  useEffect(() => {
    activeDocumentsRef.current = activeDocuments;
  }, [activeDocuments]);
  const [activePipelineStages, setActivePipelineStages] = useState<string[]>([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Sync when conversation changes
  useEffect(() => {
    const stored = localStorage.getItem(`oneshot_docs_${activeConversationId || "new"}`);
    setActiveDocuments(stored ? JSON.parse(stored) : []);
  }, [activeConversationId]);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(`oneshot_docs_${activeConversationId || "new"}`, JSON.stringify(activeDocuments));
  }, [activeDocuments, activeConversationId]);
  
  useEffect(() => {
    localStorage.setItem("oneshot_selected_subject", selectedSubject);
  }, [selectedSubject]);

  // Keep the ref in sync with state
  useEffect(() => {
    isGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  // Auto-scroll logic
  useEffect(() => {
    const scrollElement = mainScrollRef.current;
    if (!scrollElement) return;
    
    // ONLY auto-scroll if near bottom (e.g., within 200px)
    const isNearBottom = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight < 200;
    
    if (isNearBottom) {
      scrollElement.scrollTo({
        behavior: "smooth",
        top: scrollElement.scrollHeight,
      });
    }
  }, [messages, isGenerating]);

  useEffect(() => {
    if (learnerId) {
      getConversations(learnerId).then(setConversationsList).catch(console.error);
    }
  }, [learnerId]);

  useEffect(() => {
    if (activeConversationId) {
      localStorage.setItem("oneshot_active_conversation_id", String(activeConversationId));
      
      if (skipFetchRef.current) {
        skipFetchRef.current = false;
        return;
      }

      let isActive = true;
      getConversation(activeConversationId).then(data => {
        if (!isActive || isGeneratingRef.current) return; // Prevent overwriting optimistic state
        setMessages((data.messages || []).map((m: any) => ({
          id: m.id?.toString() || crypto.randomUUID(),
          role: m.role || "assistant",
          content: m.content || "",
          mode: m.mode,
          visualBlocks: Array.isArray(m.visual_blocks) ? m.visual_blocks.filter(Boolean) : []
        })));
      }).catch(err => {
        console.error("Failed to restore conversation", err);
        if (isActive) {
          setMessages([]);
          setActiveConversationId(null);
        }
      });
      
      return () => { isActive = false; };
    } else {
      localStorage.removeItem("oneshot_active_conversation_id");
      setMessages([]);
    }
  }, [activeConversationId]);

  function resizeTextarea() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }

  async function handleFileUpload(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Only PDF files are supported");
      return;
    }

    const tempId = Date.now();
    setActiveDocuments(prev => [...prev, { id: tempId, filename: file.name, status: "uploading", uploadedAt: Date.now() }]);

    try {
      const result = await uploadDocument(file, learnerId);

      if (result.duplicate) {
        setActiveDocuments(prev => prev.map(d => d.id === tempId ? { ...d, id: result.document_id, status: "ready" } : d));
        return;
      }

      setActiveDocuments(prev => prev.map(d => d.id === tempId ? { ...d, id: result.document_id, status: "processing" } : d));

      // Poll for ingestion completion
      const docId = result.document_id;
      let attempts = 0;
      const maxAttempts = 30;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const status = await getDocumentStatus(docId);
          if (status.status === "ready") {
            clearInterval(poll);
            setActiveDocuments(prev => prev.map(d => d.id === docId ? { ...d, status: "ready" } : d));
          } else if (status.status === "failed") {
            clearInterval(poll);
            setActiveDocuments(prev => prev.map(d => d.id === docId ? { ...d, status: "failed" } : d));
          } else if (attempts >= maxAttempts) {
            clearInterval(poll);
            setActiveDocuments(prev => prev.map(d => d.id === docId ? { ...d, status: "ready" } : d));
          }
        } catch {
          if (attempts >= maxAttempts) {
            clearInterval(poll);
            setActiveDocuments(prev => prev.map(d => d.id === docId ? { ...d, status: "ready" } : d));
          }
        }
      }, 2000);
    } catch (err) {
      setActiveDocuments(prev => prev.map(d => d.id === tempId ? { ...d, status: "failed" } : d));
    }
  }

  function removeDocument(id: number) {
    setActiveDocuments(prev => prev.filter(d => d.id !== id));
  }

  async function handleImageUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      alert("Image is too large. Maximum size is 5MB.");
      return;
    }

    let currentConversationId = activeConversationId;
    if (!currentConversationId) {
       try {
         const title = "Notebook Analysis";
         const newConv = await createConversation(learnerId, title);
         currentConversationId = newConv.id;
         skipFetchRef.current = true;
         setActiveConversationId(newConv.id);
         setConversationsList(prev => [newConv, ...prev]);
       } catch (error) {
         console.error("Failed to create conversation", error);
         return;
       }
    }

    const userMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();
    
    // Append a user message to show the image is being processed
    // Followed by a placeholder assistant message
    setMessages((current) => [
      ...current,
      {
        id: userMessageId,
        role: "user",
        content: `[Uploaded Image: ${file.name}]`,
      },
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
      }
    ]);

    setIsGenerating(true);
    setActivePipelineStages([]);

    try {
      await streamImageAssessment({
        file,
        learnerId,
        onEvent: (event) => {
          if (event.stage === "reading" || event.stage === "identifying" || event.stage === "evaluating" || event.stage === "weak_topics") {
            setActivePipelineStages((prev) => Array.from(new Set([...prev, event.message])));
            if (event.text) {
              setMessages((current) => current.map((msg) => msg.id === assistantMessageId ? { ...msg, content: `**Extracted:**\n\n> ${event.text}\n\n` } : msg));
            }
          } else if (event.stage === "extracted" && event.text) {
            setMessages((current) => current.map((msg) => msg.id === assistantMessageId ? { ...msg, content: `**Extracted:**\n\n> ${event.text}\n\n` } : msg));
          } else if (event.stage === "error") {
            setMessages((current) => current.map((msg) => msg.id === assistantMessageId ? { ...msg, content: `Error: ${event.message}` } : msg));
            setIsGenerating(false);
          } else if (event.stage === "complete") {
            const fb = `**Extracted:**\n\n> ${event.extracted_text}\n\n**Feedback:**\n${event.feedback}`;
            setMessages((current) => current.map((msg) => msg.id === assistantMessageId ? { ...msg, content: fb } : msg));
            setIsGenerating(false);
          }
        }
      });
    } catch (error: any) {
      console.error(error);
      setMessages((current) => current.map((msg) => msg.id === assistantMessageId ? { ...msg, content: `Failed to analyze image: ${error.message}` } : msg));
      setIsGenerating(false);
    }
  }

  async function submitMessage(explicitContent?: string) {
    const content = (typeof explicitContent === "string" ? explicitContent : draft).trim();
    if (!content || isGenerating) return;

    const currentActiveDocs = activeDocumentsRef.current;
    const hasProcessingDocs = currentActiveDocs.some(d => d.status === "uploading" || d.status === "processing");
    if (hasProcessingDocs) {
      alert("Please wait until document processing finishes.");
      return;
    }

    let currentConversationId = activeConversationId;
    if (!currentConversationId) {
       try {
         const title = content.length > 30 ? content.slice(0, 30) + "..." : content;
         const newConv = await createConversation(learnerId, title);
         currentConversationId = newConv.id;
         skipFetchRef.current = true; // Prevent the activeConversationId effect from overwriting state
         setActiveConversationId(newConv.id);
         setConversationsList(prev => [newConv, ...prev]);
       } catch (error) {
         console.error("Failed to create conversation", error);
         return;
       }
    }

    const finalActiveDocs = activeDocumentsRef.current;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      mode: selectedMode,
      attachments: finalActiveDocs,
    };
    const history = messages.map((message) => ({
      role: message.role || "user",
      content: message.content || "",
    }));

    setDraft("");
    setIsGenerating(true);
    setActivePipelineStages([]);
    
    // Clear active documents from the composer after sending so they "go with the message"
    setActiveDocuments([]);
    
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = "48px";
    });

    const assistantMessageId = crypto.randomUUID();
    
    // Safely append both user and assistant placeholder messages sequentially
    setMessages((current) => {
      const withUser = [...current, userMessage];
      return [
        ...withUser,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
        }
      ];
    });

    const previousAttachmentIds = messages.flatMap(m => m.attachments || []).filter(d => d.status === "ready").map(d => d.id);
    const currentAttachmentIds = finalActiveDocs.filter(d => d.status === "ready").map(d => d.id);
    const activeDocumentIds = Array.from(new Set([...previousAttachmentIds, ...currentAttachmentIds]));
    
    console.log("ACTIVE DOCS", finalActiveDocs);
    console.log("ACTIVE DOC IDS", activeDocumentIds);
    console.log("REQUEST PAYLOAD", {
        history,
        learningMode: selectedMode,
        message: content,
        conversationId: currentConversationId,
        activeDocumentIds
    });

    try {
      await streamChatMessage({
        history,
        learningMode: selectedMode,
        message: content,
        conversationId: currentConversationId,
        activeDocumentIds,
        onEvent: (event) => {
          if (event.type === "meta") {
            const validBlocks = Array.isArray(event.visual_blocks) ? event.visual_blocks.filter(Boolean) : [];
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantMessageId ? { ...message, visualBlocks: validBlocks } : message,
              ),
            );
            return;
          }

          if (event.type === "token") {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantMessageId
                  ? { ...message, content: `${message.content}${event.content}` }
                  : message,
              ),
            );
            return;
          }

          if (event.type === "pipeline") {
            setActivePipelineStages(prev => {
              if (prev.includes(event.label)) return prev;
              return [...prev, event.label];
            });
            return;
          }

          if (event.type === "error") {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantMessageId ? { ...message, content: event.content } : message,
              ),
            );
          }
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to reach the local AI server.";
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                content: `${errorMessage} Make sure FastAPI is running on port 8000 and Ollama is running qwen2.5:3b.`,
              }
            : message,
        ),
      );
    } finally {
      setIsGenerating(false);
    }
  }

  const sidebarOffsetClass = sidebarOpen ? "lg:left-[280px]" : "lg:left-14";

  return (
    <main className="h-screen overflow-hidden bg-[#0a0a0a] text-[#f5f5f5]">
      {learnerId === null && <OnboardingModal onComplete={setLearnerId} />}
      <div className="flex h-screen">
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.aside
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="fixed inset-y-0 left-0 z-40 w-[280px] border-r border-[#1f1f1f] bg-[#111111] lg:static"
            >
              <Sidebar 
                onToggle={() => setSidebarOpen(false)}
                conversations={conversationsList}
                activeConversationId={activeConversationId}
                onSelectConversation={setActiveConversationId}
                onNewChat={() => setActiveConversationId(null)}
                activeView={activeView}
                setActiveView={setActiveView}
              />
            </motion.aside>
          )}
        </AnimatePresence>

        {!sidebarOpen && (
          <aside className="hidden h-full w-14 shrink-0 border-r border-[#1f1f1f] bg-[#111111] lg:flex lg:flex-col lg:items-center lg:gap-3 lg:pt-3">
            <button
              type="button"
              aria-label="Expand sidebar"
              onClick={() => setSidebarOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-md text-[#9ca3af] transition hover:bg-[#1a1a1a] hover:text-[#f5f5f5]"
            >
              <ChevronRight size={17} />
            </button>
            <div className="grid h-8 w-8 place-items-center rounded-md bg-[#1a1a1a] text-xs font-semibold text-[#f5f5f5]">
              O
            </div>
          </aside>
        )}

        <section ref={mainScrollRef} className="flex min-w-0 flex-1 flex-col overflow-y-auto relative">
          <header className="sticky top-0 z-20 h-14 shrink-0 border-b border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur-md px-3">
            <div className="flex h-full items-center justify-between">
              <p className="text-sm font-medium text-[#f5f5f5]">OneShot</p>
              <button
                onClick={() => setIsProfileOpen(true)}
                className="grid h-8 w-8 place-items-center rounded-md text-[#9ca3af] transition hover:bg-[#1a1a1a] hover:text-amber-400"
                title="Student Profile Settings"
              >
                <Settings size={16} />
              </button>
            </div>
          </header>

          <ProfileModal
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            learnerId={learnerId}
          />

          {activeView === "dashboard" ? (
            <div className="flex-1 overflow-y-auto">
              <AnalyticsDashboard onStartRevision={(topic) => {
                setActiveView("exams");
                // In a real app we'd pass the topic down, but switching the view is enough for the demo
              }} />
            </div>
          ) : activeView === "exams" ? (
            <div className="flex-1 overflow-y-auto">
              <ExamWorkspace 
                learnerId={learnerId === null ? undefined : learnerId} 
                onFinishExam={async (score, questions, answers, evaluations) => {
                  setActiveView("chat");
                  
                  // Submit exam results to analytics backend silently
                  if (learnerId) {
                    try {
                      await fetch(`http://localhost:8000/api/exams/submit`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          learner_id: learnerId,
                          subject: questions[0]?.type || "unknown subject",
                          questions: questions.map(q => ({
                            id: q.id,
                            chapter: (q as any).chapter || "General",
                            type: q.type,
                            correct: evaluations?.[q.id]?.correct || false
                          }))
                        })
                      });
                    } catch (err) {
                      console.error("Failed to submit exam analytics", err);
                    }
                  }

                  const examResultsPayload = questions.map(q => ({
                    id: q.id,
                    question: q.question,
                    chapter: (q as any).chapter || "General",
                    concepts: (q as any).concepts || [],
                    type: q.type,
                    student_answer: answers[q.id],
                    expected_answer: q.answer,
                    evaluation: evaluations?.[q.id]
                  }));

                  // 1. Setup Chat UI state
                  const assistantMessageId = crypto.randomUUID();
                  setIsGenerating(true);
                  setActivePipelineStages([]);
                  setDraft("");
                  
                  let newConvId: number | undefined;
                  if (learnerId) {
                    try {
                      const newConv = await createConversation(learnerId, "Exam Results: " + (questions[0]?.type || "Assessment"));
                      newConvId = newConv.id;
                      skipFetchRef.current = true;
                      setActiveConversationId(newConv.id);
                      setConversationsList(prev => [newConv, ...prev]);
                    } catch (e) {
                      console.error("Failed to create conv for exam", e);
                    }
                  }

                  // Empty history because it's a new conversation
                  const history: any[] = [];
                  
                  // Set messages to ONLY the placeholder assistant message (new tab)
                  setMessages([
                    {
                      id: assistantMessageId,
                      role: "assistant",
                      content: "",
                    }
                  ]);

                  // 2. Stream transition
                  try {
                    await streamExamTransition({
                      history,
                      learningMode: selectedMode,
                      examResults: examResultsPayload,
                      onEvent: (event) => {
                        if (event.type === "meta") {
                          const validBlocks = Array.isArray(event.visual_blocks) ? event.visual_blocks.filter(Boolean) : [];
                          setMessages((current) =>
                            current.map((message) =>
                              message.id === assistantMessageId ? { ...message, visualBlocks: validBlocks } : message,
                            ),
                          );
                          return;
                        }

                        if (event.type === "chunk") {
                          setMessages((current) =>
                            current.map((message) =>
                              message.id === assistantMessageId
                                ? { ...message, content: `${message.content}${event.text}` }
                                : message,
                            ),
                          );
                          return;
                        }

                        if (event.type === "done" || event.type === "error") {
                           setIsGenerating(false);
                        }
                      }
                    });
                  } catch (err) {
                     console.error("Failed to stream exam transition", err);
                     setIsGenerating(false);
                  }
                }} 
              />
            </div>
          ) : activeView === "chat" ? (
            <>
              <ConversationWorkspace 
                isGenerating={isGenerating} 
                messages={messages} 
                draft={draft}
                onSelectPrompt={(p) => {
                  setDraft(p);
                  submitMessage(p);
                }} 
              />
              <Composer
                draft={draft}
                modes={modes}
                pipelineItems={activePipelineStages}
                isGenerating={isGenerating}
                selectedMode={selectedMode}
                textareaRef={textareaRef}
                activeDocuments={activeDocuments}
                onFileUpload={handleFileUpload}
                onImageUpload={handleImageUpload}
                onRemoveDocument={removeDocument}
                onDraftChange={(value) => {
                  setDraft(value);
                  requestAnimationFrame(resizeTextarea);
                }}
                onModeChange={setSelectedMode}
                onSubmit={submitMessage}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Interactive Whiteboard coming soon...
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function OnboardingModal({ onComplete }: { onComplete: (id: number) => void }) {
  const [displayName, setDisplayName] = useState("");
  const [grade, setGrade] = useState("Class 9");
  const [board, setBoard] = useState("SSC");
  const [language, setLanguage] = useState("en");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [weakTopics, setWeakTopics] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const availableSubjects = ["Physics", "Math", "Chemistry", "Biology", "Computer Science"];

  const toggleSubject = (s: string) => {
    setSubjects((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setIsSubmitting(true);
    setError("");
    try {
      const data = await createLearnerProfile({
        display_name: displayName,
        grade,
        board,
        language_preference: language,
        subjects_of_interest: subjects,
        weak_topics: weakTopics
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      localStorage.setItem("oneshot_learner_id", String(data.id));
      // Persist profile locally so the exam engine can read it
      localStorage.setItem("oneshot_profile", JSON.stringify({
        display_name: displayName,
        grade,
        board,
        language_preference: language,
        subjects_of_interest: subjects,
        weak_topics: weakTopics.split(",").map((t: string) => t.trim()).filter(Boolean),
      }));
      onComplete(data.id);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to create profile. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[#1f1f1f] bg-[#111111] p-6 shadow-2xl">
        <h2 className="mb-2 text-xl font-semibold text-[#f5f5f5]">Welcome to OneShot</h2>
        <p className="mb-6 text-sm text-[#9ca3af]">Let's set up your personalized learning profile.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="mb-1 block text-xs text-[#9ca3af]">Display Name</label>
            <input
              id="displayName"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-sm text-[#f5f5f5] outline-none focus:border-[#555]"
              placeholder="What should we call you?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="grade" className="mb-1 block text-xs text-[#9ca3af]">Grade/Class</label>
              <select
                id="grade"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-sm text-[#f5f5f5] outline-none"
              >
                <option value="Class 8">Class 8</option>
                <option value="Class 9">Class 9</option>
                <option value="Class 10">Class 10</option>
                <option value="Class 11">Class 11</option>
                <option value="Class 12">Class 12</option>
              </select>
            </div>
            <div>
              <label htmlFor="board" className="mb-1 block text-xs text-[#9ca3af]">Board/Curriculum</label>
              <select
                id="board"
                value={board}
                onChange={(e) => setBoard(e.target.value)}
                className="w-full rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-sm text-[#f5f5f5] outline-none"
              >
                <option value="SSC">SSC (National)</option>
                <option value="HSC">HSC (National)</option>
                <option value="Edexcel">Edexcel</option>
                <option value="Cambridge">Cambridge</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#9ca3af]">Language Preference</label>
            <div className="flex gap-4">
              <label htmlFor="lang-en" className="flex cursor-pointer items-center gap-2 text-sm text-[#f5f5f5]">
                <input
                  id="lang-en"
                  type="radio"
                  name="language"
                  checked={language === "en"}
                  onChange={() => setLanguage("en")}
                  className="cursor-pointer"
                />{" "}
                English
              </label>
              <label htmlFor="lang-bn" className="flex cursor-pointer items-center gap-2 text-sm text-[#f5f5f5]">
                <input
                  id="lang-bn"
                  type="radio"
                  name="language"
                  checked={language === "bn"}
                  onChange={() => setLanguage("bn")}
                  className="cursor-pointer"
                />{" "}
                Bangla
              </label>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs text-[#9ca3af]">Subjects of Interest</label>
            <div className="flex flex-wrap gap-2">
              {availableSubjects.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => toggleSubject(s)}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                    subjects.includes(s)
                      ? "border-transparent bg-white text-black"
                      : "border-[#333] bg-[#1a1a1a] text-[#f5f5f5] hover:border-[#555]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="weakTopics" className="mb-1 block text-xs text-[#9ca3af]">Weak Topics (comma separated, optional)</label>
            <input
              id="weakTopics"
              value={weakTopics}
              onChange={(e) => setWeakTopics(e.target.value)}
              className="w-full rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-sm text-[#f5f5f5] outline-none focus:border-[#555]"
              placeholder="e.g. Vectors, Integration"
            />
          </div>

          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

          <button
            disabled={isSubmitting || !displayName.trim()}
            type="submit"
            className="mt-6 w-full rounded-lg bg-[#f5f5f5] py-2.5 text-sm font-medium text-[#0a0a0a] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Creating Profile..." : "Start Learning"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Sidebar({ 
  onToggle, 
  conversations, 
  activeConversationId,
  onSelectConversation,
  onNewChat,
  activeView,
  setActiveView
}: { 
  onToggle: () => void;
  conversations: Conversation[];
  activeConversationId: number | null;
  onSelectConversation: (id: number) => void;
  onNewChat: () => void;
  activeView: string;
  setActiveView: (view: "chat" | "whiteboard" | "exams") => void;
}) {
  return (
    <div className="flex h-full flex-col px-3 py-3">
      <div className="flex h-9 items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-[#1a1a1a] text-xs font-semibold text-[#f5f5f5]">
            O
          </div>
          <p className="truncate text-sm font-medium text-[#f5f5f5]">OneShot</p>
        </div>
        <button
          type="button"
          aria-label="Collapse sidebar"
          onClick={onToggle}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-[#9ca3af] transition hover:bg-[#1a1a1a] hover:text-[#f5f5f5]"
        >
          <Menu size={16} />
        </button>
      </div>

      <label className="mt-5 flex h-10 items-center gap-3 rounded-lg bg-[#171717] px-3 text-sm text-[#9ca3af]">
        <Search size={15} />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm text-[#f5f5f5] outline-none placeholder:text-[#9ca3af]"
          placeholder="Search chats"
          type="search"
        />
      </label>

      <nav className="mt-4 space-y-1">
        <div onClick={() => setActiveView("dashboard")}>
          <SidebarButton icon={<BarChart2 size={16} />} label="Dashboard" active={activeView === "dashboard"} />
        </div>
        <div onClick={() => setActiveView("chat")}>
          <SidebarButton icon={<Search size={16} />} label="Chat" active={activeView === "chat"} />
        </div>
        <div onClick={() => setActiveView("whiteboard")}>
          <SidebarButton icon={<PenTool size={16} />} label="Interactive Whiteboard" active={activeView === "whiteboard"} />
        </div>
        <div onClick={() => setActiveView("exams")}>
          <SidebarButton icon={<CheckCircle size={16} />} label="Exams" active={activeView === "exams"} />
        </div>
      </nav>

      <p className="mt-6 px-2 text-[11px] uppercase tracking-[0.16em] text-[#9ca3af]">Saved chats</p>

      <button
          type="button"
          onClick={onNewChat}
          className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm transition text-[#9ca3af] hover:bg-[#171717] hover:text-[#f5f5f5]"
        >
          <Plus size={16} />
          <span>New Chat</span>
        </button>

      <div className="pretty-scroll mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            type="button"
            className={`w-full rounded-lg px-3 py-3 text-left transition ${
              activeConversationId === conversation.id ? "bg-[#1a1a1a]" : "hover:bg-[#171717]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`truncate text-sm ${activeConversationId === conversation.id ? "text-white" : "text-[#f5f5f5]"}`}>{conversation.title}</p>
                <p className="mt-1 text-xs text-[#9ca3af]">{new Date(conversation.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SidebarButton({
  active,
  icon,
  label,
}: {
  active?: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm transition ${
        active ? "bg-[#1a1a1a] text-[#f5f5f5]" : "text-[#9ca3af] hover:bg-[#171717] hover:text-[#f5f5f5]"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function ConversationWorkspace({ isGenerating, messages, draft, onSelectPrompt }: { isGenerating: boolean; messages: Message[]; draft: string; onSelectPrompt: (p: string) => void }) {
  const showEmptyState = messages.length === 0 && draft.trim().length === 0;

  return (
    <div className="flex flex-1 flex-col px-4 pt-8 pb-4 sm:px-6 sm:pt-10">
      <AnimatePresence mode="wait">
        {showEmptyState ? (
          <EmptyState key="empty-state" onSelectPrompt={onSelectPrompt} />
        ) : (
          <motion.div 
            key="chat-messages"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mx-auto flex w-full max-w-3xl flex-col gap-6"
          >
            {messages.map((message, index) => (
              <ChatBubble
                isStreaming={isGenerating && message.role === "assistant" && index === messages.length - 1}
                key={message.id}
                message={message}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ onSelectPrompt }: { onSelectPrompt: (prompt: string) => void }) {
  const prompts = [
    { title: "Explain a math problem", icon: <Sigma size={18} /> },
    { title: "Summarize a PDF", icon: <Paperclip size={18} /> },
    { title: "Help me study physics", icon: <Atom size={18} /> },
    { title: "Generate quiz questions", icon: <PenTool size={18} /> },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, filter: "blur(8px)", scale: 0.96 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="flex flex-1 flex-col items-center justify-center px-4"
    >
      <div className="mb-8 text-center">
        <h2 className="mb-3 text-3xl font-semibold tracking-tight text-[#f5f5f5]">What's on the agenda today?</h2>
        <p className="text-sm text-[#9ca3af]">Ask anything, or try an example below.</p>
      </div>

      <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
        {prompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onSelectPrompt(prompt.title)}
            className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 text-left transition-all hover:bg-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.03)] active:scale-[0.98]"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/40 text-[#f5f5f5] transition-colors group-hover:bg-black/60 group-hover:text-white">
              {prompt.icon}
            </div>
            <span className="text-sm font-medium text-[#e5e5e5] group-hover:text-white">{prompt.title}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function ChatBubble({ isStreaming, message }: { isStreaming: boolean; message: Message }) {
  const isUser = message.role === "user";

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[760px] w-full text-sm leading-6 text-[#f5f5f5] ${
          isUser ? "rounded-2xl bg-[#1a1a1a] px-4 py-3" : ""
        }`}
      >
        {isUser && message.attachments && message.attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {message.attachments.map(doc => (
              <div key={doc.id} className="flex items-center gap-1.5 rounded bg-white/10 px-2 py-1 text-xs font-medium text-[#d1d5db]">
                <Paperclip size={12} className="text-[#9ca3af]" />
                <span className="max-w-[150px] truncate">{doc.filename}</span>
              </div>
            ))}
          </div>
        )}
        <SafeMessageContent message={message} isUser={isUser} isStreaming={isStreaming} />
      </div>
    </motion.article>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return <div className="text-red-400 text-sm p-3 bg-red-950/30 rounded-lg">Failed to render message content.</div>;
    }
    return this.props.children;
  }
}

function SafeMessageContent({ message, isUser, isStreaming }: { message: Message; isUser: boolean; isStreaming: boolean }) {
  return (
    <ErrorBoundary>
      {message.mode && (
        <p className="mb-1 text-xs text-[#9ca3af]">
          {modes.find((mode) => mode.id === message.mode)?.label || message.mode}
        </p>
      )}
      {isUser ? (
        <p className="whitespace-pre-wrap">{message.content}</p>
      ) : message.content ? (
        <AssistantMarkdown content={message.content} isStreaming={isStreaming} />
      ) : (
        <ThinkingState />
      )}
      {Array.isArray(message.visualBlocks) && message.visualBlocks.filter(Boolean).map((block: any, idx: number) => (
        <VisualBlockRenderer block={block} key={block?.id || idx} />
      ))}
    </ErrorBoundary>
  );
}

function ThinkingState() {
  return (
    <div className="flex items-center gap-2 text-sm text-[#9ca3af]">
      <span>Thinking</span>
      <span className="thinking-dots flex gap-1" aria-hidden="true">
        <span className="h-1 w-1 rounded-full bg-current" />
        <span className="h-1 w-1 rounded-full bg-current" />
        <span className="h-1 w-1 rounded-full bg-current" />
      </span>
    </div>
  );
}

function Composer({
  draft,
  modes,
  pipelineItems,
  isGenerating,
  selectedMode,
  textareaRef,
  activeDocuments,
  onFileUpload,
  onImageUpload,
  onRemoveDocument,
  onDraftChange,
  onModeChange,
  onSubmit,
}: {
  draft: string;
  modes: { id: LearningMode; label: string }[];
  pipelineItems: string[];
  isGenerating: boolean;
  selectedMode: LearningMode;
  textareaRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  activeDocuments: ActiveDocument[];
  onFileUpload: (file: File) => void;
  onImageUpload: (file: File) => void;
  onRemoveDocument: (id: number) => void;
  onDraftChange: (value: string) => void;
  onModeChange: (mode: LearningMode) => void;
  onSubmit: (explicitContent?: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    imageInputRef.current?.click();
  };

  const handlePlusClick = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setShowAttachmentMenu((prev) => !prev);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
    e.target.value = "";
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        onFileUpload(file);
      } else if (file.type.startsWith("image/")) {
        onImageUpload(file);
      }
    }
  };

  return (
    <footer className="sticky bottom-0 z-30 shrink-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/95 to-[#0a0a0a]/80 backdrop-blur-md px-4 pb-6 pt-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
          {modes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => onModeChange(mode.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium transition-all ${
                selectedMode === mode.id
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-[#9ca3af] hover:bg-white/5 hover:text-[#f5f5f5]"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {isGenerating && pipelineItems.length > 0 ? (
          <div className="mb-3 flex flex-col gap-0.5 px-2 text-[13px] text-[#9ca3af]">
            {pipelineItems.map((item) => (
              <motion.span 
                initial={{ opacity: 0, y: 5 }} 
                animate={{ opacity: 1, y: 0 }} 
                key={item}
              >
                {item}
              </motion.span>
            ))}
          </div>
        ) : null}

        {/* Attached Documents Area */}
        {activeDocuments.length > 0 && (
          <div className="mb-3 flex flex-col gap-2">
            <p className="px-2 text-[11px] font-medium uppercase tracking-wider text-[#9ca3af]">
              Attached Documents
            </p>
            <div className="flex flex-wrap gap-2">
              {activeDocuments.map(doc => (
                <div key={doc.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-1.5 text-[13px] text-[#f5f5f5]">
                  <Paperclip size={14} className="text-[#9ca3af]" />
                  <span className="max-w-[150px] truncate">{doc.filename}</span>
                  {doc.status === "uploading" && <Upload size={14} className="animate-pulse text-amber-400" />}
                  {doc.status === "processing" && <Loader size={14} className="animate-spin text-amber-400" />}
                  {doc.status === "ready" && <CheckCircle size={14} className="text-emerald-400" />}
                  {doc.status === "failed" && <X size={14} className="text-red-400" />}
                  <button onClick={() => onRemoveDocument(doc.id)} className="ml-1 rounded-full p-0.5 hover:bg-white/10 text-[#9ca3af] hover:text-white transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div 
          className={`group relative rounded-[32px] border ${isDragging ? 'border-amber-400/50 bg-[#1a1a1a]' : 'border-white/10 bg-[#171717]/80'} p-2 shadow-[0_0_40px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl transition-all focus-within:border-white/20 focus-within:bg-[#1a1a1a]/90 focus-within:shadow-[0_0_50px_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.08)]`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="hidden"
              aria-hidden="true"
            />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              aria-hidden="true"
            />

            <div className="relative flex items-center">
              <button
                type="button"
                aria-label="Add attachment"
                onClick={handlePlusClick}
                className={`mb-1 grid h-10 w-10 shrink-0 place-items-center rounded-full transition-all active:scale-95 text-[#9ca3af] ${showAttachmentMenu ? 'bg-white/10 text-white' : 'bg-white/0 hover:bg-white/10 hover:text-white'}`}
              >
                <Plus size={18} />
              </button>

              <AnimatePresence>
                {showAttachmentMenu && (
                  <AttachmentMenu
                    onClose={() => setShowAttachmentMenu(false)}
                    onUploadPdf={handleAttachClick}
                    onUploadImage={handleCameraClick}
                  />
                )}
              </AnimatePresence>
            </div>

            <textarea
              ref={textareaRef}
              value={draft}
              rows={1}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onSubmit();
                }
              }}
              placeholder="Ask about a concept or request a visual explanation"
              className="pretty-scroll mb-1 max-h-[200px] min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-relaxed text-[#f5f5f5] outline-none placeholder:text-[#6b7280]"
            />

            <button
              type="button"
              aria-label="Voice Input"
              className="mb-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/0 text-[#9ca3af] transition-all hover:bg-white/10 hover:text-white active:scale-95"
            >
              <Mic size={18} />
            </button>

            <button
              type="button"
              aria-label="Send message"
              onClick={() => onSubmit()}
              className="mb-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-black transition-all hover:scale-105 hover:bg-[#f0f0f0] active:scale-95 disabled:pointer-events-none disabled:bg-white/10 disabled:text-white/30"
              disabled={!draft.trim() || isGenerating || activeDocuments.some(d => d.status === "uploading" || d.status === "processing")}
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
