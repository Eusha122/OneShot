import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Atom, ChevronRight, Menu, Mic, Paperclip, PenTool, Plus, Search, Sigma } from "lucide-react";
import { AssistantMarkdown } from "../features/chat/AssistantMarkdown";
import { VisualBlockRenderer } from "../features/visual-blocks/VisualBlockRenderer";
import type { LearningVisualBlock } from "../features/visual-blocks/visualBlockTypes";
import { streamChatMessage, getConversations, getConversation, createConversation, createLearnerProfile, type Conversation } from "../lib/chatApi";

type LearningMode =
  | "explain_simply"
  | "exam_mode"
  | "visual_mode"
  | "step_by_step"
  | "fast_revision"
  | "challenge_me";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: LearningMode;
  visualBlocks?: LearningVisualBlock[];
}

const modes: { id: LearningMode; label: string }[] = [
  { id: "explain_simply", label: "Explain Simply" },
  { id: "exam_mode", label: "Exam Mode" },
  { id: "visual_mode", label: "Visual Mode" },
  { id: "step_by_step", label: "Step-by-Step" },
  { id: "fast_revision", label: "Fast Revision" },
  { id: "challenge_me", label: "Challenge Me" },
];

const pipelineItems = ["Searching physics book", "Preparing visual block", "Generating explanation"];

export function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedMode, setSelectedMode] = useState<LearningMode>("visual_mode");
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

  // Keep the ref in sync with state
  useEffect(() => {
    isGeneratingRef.current = isGenerating;
  }, [isGenerating]);

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

  async function submitMessage(explicitContent?: string) {
    const content = (typeof explicitContent === "string" ? explicitContent : draft).trim();
    if (!content || isGenerating) return;

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

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      mode: selectedMode,
    };
    const history = messages.map((message) => ({
      role: message.role || "user",
      content: message.content || "",
    }));

    setDraft("");
    setIsGenerating(true);
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

    try {
      await streamChatMessage({
        history,
        learningMode: selectedMode,
        message: content,
        conversationId: currentConversationId,
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

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="h-14 border-b border-[#1f1f1f] bg-[#0a0a0a] px-3">
            <div className="flex h-full items-center gap-2">
              <p className="text-sm font-medium text-[#f5f5f5]">OneShot</p>
            </div>
          </header>

          <ConversationWorkspace 
            isGenerating={isGenerating} 
            messages={messages} 
            draft={draft}
            onSelectPrompt={(p) => {
              setDraft(p);
              submitMessage(p);
            }} 
          />
        </section>
      </div>

      <Composer
        sidebarOffsetClass={sidebarOffsetClass}
        draft={draft}
        modes={modes}
        pipelineItems={pipelineItems}
        isGenerating={isGenerating}
        selectedMode={selectedMode}
        textareaRef={textareaRef}
        onDraftChange={(value) => {
          setDraft(value);
          requestAnimationFrame(resizeTextarea);
        }}
        onModeChange={setSelectedMode}
        onSubmit={submitMessage}
      />
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
  onNewChat 
}: { 
  onToggle: () => void;
  conversations: Conversation[];
  activeConversationId: number | null;
  onSelectConversation: (id: number) => void;
  onNewChat: () => void;
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
        <SidebarButton icon={<PenTool size={16} />} label="Interactive Whiteboard" active />
        <SidebarButton icon={<Atom size={16} />} label="Physics Challenges" />
        <SidebarButton icon={<Sigma size={16} />} label="Math Challenges" />
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
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;
    scrollElement.scrollTo({
      behavior: "smooth",
      top: scrollElement.scrollHeight,
    });
  }, [messages]);

  const showEmptyState = messages.length === 0 && draft.trim().length === 0;

  return (
    <div ref={scrollRef} className="pretty-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-[200px] pt-8 sm:px-6 sm:pt-10">
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
  sidebarOffsetClass,
  draft,
  modes,
  pipelineItems,
  isGenerating,
  selectedMode,
  textareaRef,
  onDraftChange,
  onModeChange,
  onSubmit,
}: {
  sidebarOffsetClass: string;
  draft: string;
  modes: { id: LearningMode; label: string }[];
  pipelineItems: string[];
  isGenerating: boolean;
  selectedMode: LearningMode;
  textareaRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  onDraftChange: (value: string) => void;
  onModeChange: (mode: LearningMode) => void;
  onSubmit: (explicitContent?: string) => void;
}) {
  return (
    <footer
      className={`pointer-events-none fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent px-4 pb-6 pt-10 sm:px-6 ${sidebarOffsetClass}`}
    >
      <div className="pointer-events-auto mx-auto max-w-3xl">
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

        {isGenerating ? (
          <div className="mb-3 flex flex-col gap-0.5 px-2 text-[13px] text-[#9ca3af]">
            {pipelineItems.map((item) => (
              <motion.span 
                initial={{ opacity: 0, y: 5 }} 
                animate={{ opacity: 1, y: 0 }} 
                key={item}
              >
                {item}...
              </motion.span>
            ))}
          </div>
        ) : null}

        <div className="group relative rounded-[32px] border border-white/10 bg-[#171717]/80 p-2 shadow-[0_0_40px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl transition-all focus-within:border-white/20 focus-within:bg-[#1a1a1a]/90 focus-within:shadow-[0_0_50px_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="flex items-end gap-2">
            <button
              type="button"
              aria-label="Attach learning material"
              className="mb-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/0 text-[#9ca3af] transition-all hover:bg-white/10 hover:text-white active:scale-95"
            >
              <Paperclip size={18} />
            </button>

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
              disabled={!draft.trim() || isGenerating}
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
