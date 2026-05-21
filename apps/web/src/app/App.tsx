import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Atom, ChevronRight, Menu, Paperclip, PenTool, Search, Sigma } from "lucide-react";
import { AssistantMarkdown } from "../features/chat/AssistantMarkdown";
import { VisualBlockRenderer } from "../features/visual-blocks/VisualBlockRenderer";
import type { LearningVisualBlock } from "../features/visual-blocks/visualBlockTypes";
import { streamChatMessage } from "../lib/chatApi";

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

const conversations = [
  { id: "c1", title: "Projectile motion and range", subject: "Physics", time: "Today" },
  { id: "c2", title: "Sine graph transformation", subject: "Math", time: "Yesterday" },
  { id: "c3", title: "Newton's laws revision", subject: "Physics", time: "May 20" },
];

const initialMessages: Message[] = [
  {
    id: "m1",
    role: "user",
    mode: "visual_mode",
    content: "Explain projectile motion visually for SSC level.",
  },
  {
    id: "m2",
    role: "assistant",
    content:
      "Projectile motion is two-direction motion: horizontal velocity stays steady while vertical velocity changes due to gravity.",
    visualBlocks: [
      {
        id: "visual-projectile-demo",
        type: "physics.projectile",
        params: {
          speed: 32,
          angleDegrees: 42,
          gravity: 9.8,
        },
      },
    ],
  },
  {
    id: "m3",
    role: "user",
    mode: "visual_mode",
    content: "Show how changing sine wave parameters affects the graph.",
  },
  {
    id: "m4",
    role: "assistant",
    content:
      "A sine graph changes shape through amplitude, frequency, and phase. Amplitude controls height, frequency controls how often it repeats, and phase shifts it left or right.",
    visualBlocks: [
      {
        id: "visual-sine-demo",
        type: "math.sineGraph",
        params: {
          amplitude: 1.4,
          frequency: 1,
          phase: 0,
        },
      },
    ],
  },
];

const pipelineItems = ["Searching physics book", "Preparing visual block", "Generating explanation"];

export function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedMode, setSelectedMode] = useState<LearningMode>("visual_mode");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isGenerating, setIsGenerating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function resizeTextarea() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }

  async function submitMessage() {
    const content = draft.trim();
    if (!content || isGenerating) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      mode: selectedMode,
    };
    const history = messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setIsGenerating(true);
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = "48px";
    });

    const assistantMessageId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
      },
    ]);

    try {
      await streamChatMessage({
        history,
        learningMode: selectedMode,
        message: content,
        onEvent: (event) => {
          if (event.type === "meta") {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantMessageId ? { ...message, visualBlocks: event.visual_blocks } : message,
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
              <Sidebar onToggle={() => setSidebarOpen(false)} />
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

          <ConversationWorkspace isGenerating={isGenerating} messages={messages} />
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

function Sidebar({ onToggle }: { onToggle: () => void }) {
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

      <div className="pretty-scroll mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            type="button"
            className="w-full rounded-lg px-3 py-3 text-left transition hover:bg-[#171717]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-[#f5f5f5]">{conversation.title}</p>
                <p className="mt-1 text-xs text-[#9ca3af]">{conversation.subject}</p>
              </div>
              <span className="shrink-0 text-[11px] text-[#9ca3af]">{conversation.time}</span>
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

function ConversationWorkspace({ isGenerating, messages }: { isGenerating: boolean; messages: Message[] }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;
    scrollElement.scrollTo({
      behavior: "smooth",
      top: scrollElement.scrollHeight,
    });
  }, [messages]);

  return (
    <div ref={scrollRef} className="pretty-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-[340px] pt-8 sm:px-6 sm:pt-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        {messages.map((message, index) => (
          <ChatBubble
            isStreaming={isGenerating && message.role === "assistant" && index === messages.length - 1}
            key={message.id}
            message={message}
          />
        ))}
      </div>
    </div>
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
        className={`max-w-[760px] text-sm leading-6 text-[#f5f5f5] ${
          isUser ? "rounded-2xl bg-[#1a1a1a] px-4 py-3" : ""
        }`}
      >
        {message.mode && (
          <p className="mb-1 text-xs text-[#9ca3af]">
            {modes.find((mode) => mode.id === message.mode)?.label}
          </p>
        )}
        {isUser ? (
          <p>{message.content}</p>
        ) : message.content ? (
          <AssistantMarkdown content={message.content} isStreaming={isStreaming} />
        ) : (
          <ThinkingState />
        )}
        {message.visualBlocks?.map((block) => <VisualBlockRenderer block={block} key={block.id} />)}
      </div>
    </motion.article>
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
  onSubmit: () => void;
}) {
  return (
    <footer
      className={`pointer-events-none fixed bottom-0 left-0 right-0 z-30 border-t border-[#1f1f1f] bg-[#0a0a0a] px-4 pb-5 pt-3 sm:px-6 ${sidebarOffsetClass}`}
    >
      <div className="pointer-events-auto mx-auto max-w-3xl">
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
          {modes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => onModeChange(mode.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs transition ${
                selectedMode === mode.id
                  ? "bg-[#1f1f1f] text-[#f5f5f5]"
                  : "text-[#9ca3af] hover:bg-[#171717] hover:text-[#f5f5f5]"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {isGenerating ? (
          <div className="mb-2 flex flex-col gap-0.5 px-1 text-xs text-[#9ca3af]">
            {pipelineItems.map((item) => (
              <span key={item}>{item}...</span>
            ))}
          </div>
        ) : null}

        <div className="rounded-2xl border border-[#1f1f1f] bg-[#111111] p-2 shadow-[0_12px_40px_rgba(0,0,0,0.28)]">
          <div className="flex items-end gap-2">
            <button
              type="button"
              aria-label="Attach learning material"
              className="mb-1 grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[#9ca3af] transition hover:bg-[#1a1a1a] hover:text-[#f5f5f5]"
            >
              <Paperclip size={17} />
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
              className="pretty-scroll max-h-[180px] min-h-12 flex-1 resize-none bg-transparent px-1 py-3 text-sm leading-6 text-[#f5f5f5] outline-none placeholder:text-[#9ca3af]"
            />

            <button
              type="button"
              aria-label="Send message"
              onClick={onSubmit}
              className="mb-1 grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#f5f5f5] text-[#0a0a0a] transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#222222] disabled:text-[#6b7280]"
              disabled={!draft.trim() || isGenerating}
            >
              <ArrowUp size={17} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
