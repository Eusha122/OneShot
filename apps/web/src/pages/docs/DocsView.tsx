import React, { useEffect, useState, Suspense, useCallback } from "react";
import { Loader, WifiOff, RefreshCw, AlertTriangle } from "lucide-react";
import { API_BASE_URL } from "../../lib/chatApi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { motion, Variants } from "framer-motion";
import { Github, Linkedin } from "lucide-react";

const DocsContainer = ({ children, className = "" }: any) => (
  <div className={`max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 w-full ${className}`}>
    {children}
  </div>
);

const DocsWideSection = ({ children, className = "", id }: any) => (
  <motion.section 
    id={id}
    className={`max-w-[1200px] mx-auto w-full docs-section-spacing ${className}`}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, margin: "-50px" }}
    variants={sectionVariants}
  >
    {children}
  </motion.section>
);

// Lazy load heavy components
const ArchitectureView = React.lazy(() => import("../../components/docs/ArchitectureView"));

type ErrorType = "offline" | "forbidden" | "generic";

interface ErrorState {
  type: ErrorType;
  message: string;
}

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

export function DocsView() {
  const [data, setData] = useState<any>(null);
  const [liveStats, setLiveStats] = useState<any>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Phase 5: Ping /api/health first
    try {
      const healthRes = await fetch(`${API_BASE_URL}/api/health`);
      if (!healthRes.ok) {
        throw new Error("Health check failed");
      }
      console.log("✅ Backend health check passed");
    } catch {
      setError({
        type: "offline",
        message: "Unable to connect to backend API. Check if FastAPI server is running on localhost:8000."
      });
      setLoading(false);
      return;
    }

    // Main data fetch
    try {
      // Fetch docs data — only /public is critical, stats and status are optional
      const docsRes = await fetch(`${API_BASE_URL}/api/docs/public`);

      if (docsRes.status === 403) {
        setError({
          type: "forbidden",
          message: "Documentation is currently unavailable or scheduled for a later date."
        });
        setLoading(false);
        return;
      }

      if (!docsRes.ok) {
        const errBody = await docsRes.json().catch(() => null);
        throw new Error(errBody?.detail || `Server returned ${docsRes.status}`);
      }

      setData(await docsRes.json());

      // Non-critical: fetch stats and status independently (don't crash the page)
      try {
        const statsRes = await fetch(`${API_BASE_URL}/api/docs/live-stats`);
        if (statsRes.ok) setLiveStats(await statsRes.json());
      } catch {
        console.warn("⚠ Failed to load live stats (non-critical)");
      }

      try {
        const statusRes = await fetch(`${API_BASE_URL}/api/docs/system-status`);
        if (statusRes.ok) setSystemStatus(await statusRes.json());
      } catch {
        console.warn("⚠ Failed to load system status (non-critical)");
      }
    } catch (err: any) {
      // Detect CORS / network errors
      if (err instanceof TypeError && (err.message.includes("fetch") || err.message.includes("Failed"))) {
        setError({
          type: "offline",
          message: "Network error — possible CORS issue or backend unreachable."
        });
      } else {
        setError({
          type: "generic",
          message: err.message || "Failed to load documentation."
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRetry = async () => {
    setRetrying(true);
    await fetchData();
    setRetrying(false);
  };

  // Error states
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
        <div className="text-center max-w-md space-y-6 p-8">
          {error.type === "offline" ? (
            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
              <WifiOff size={32} className="text-red-400" />
            </div>
          ) : error.type === "forbidden" ? (
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle size={32} className="text-amber-400" />
            </div>
          ) : (
            <div className="w-16 h-16 mx-auto rounded-full bg-gray-500/10 flex items-center justify-center">
              <AlertTriangle size={32} className="text-gray-400" />
            </div>
          )}

          <h1 className="text-2xl font-bold">
            {error.type === "offline" ? "Backend Offline" : error.type === "forbidden" ? "Not Available" : "Something Went Wrong"}
          </h1>

          <p className="text-gray-400 text-sm leading-relaxed">{error.message}</p>

          {error.type !== "forbidden" && (
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
            >
              <RefreshCw size={16} className={retrying ? "animate-spin" : ""} />
              {retrying ? "Retrying..." : "Retry Connection"}
            </button>
          )}

          {error.type === "offline" && (
            <p className="text-xs text-gray-600 mt-4">
              Expected backend at: <code className="text-gray-500">{API_BASE_URL}</code>
            </p>
          )}
        </div>
      </div>
    );
  }

  // Loading state
  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
        <Loader className="animate-spin mr-2" /> Loading Documentation...
      </div>
    );
  }

  const { config, sections, team } = data;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] font-sans selection:bg-amber-500/30">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-[#1f1f1f] bg-[#0a0a0a]/80 backdrop-blur-md px-6 py-4 flex justify-between items-center print:hidden">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-xl tracking-tight">{config.site_title}</h1>
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            System Online
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => window.print()} className="text-sm px-4 py-2 rounded-lg bg-[#1a1a1a] border border-[#333] hover:border-[#555] transition text-white">
            Export PDF
          </button>
        </div>
      </header>

      <DocsContainer className="py-4 md:py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
        {/* Sticky Sidebar Navigation */}
        <aside className="hidden lg:block lg:col-span-3 print:hidden relative">
          <div className="sticky top-24 backdrop-blur-xl border border-white/5 bg-white/[0.01] rounded-2xl p-6 shadow-2xl">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-white/10 to-transparent rounded-l-2xl"></div>
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-6">Contents</h3>
            <ul className="space-y-4 text-[13px] font-medium text-gray-400">
              <li><a href="#hero" className="hover:text-white hover:translate-x-1 transition-all duration-300 block">Overview</a></li>
              {sections.map((sec: any) => (
                <li key={sec.id}><a href={`#section-${sec.id}`} className="hover:text-white hover:translate-x-1 transition-all duration-300 block">{sec.title}</a></li>
              ))}
              <li><a href="#architecture" className="hover:text-white hover:translate-x-1 transition-all duration-300 block">System Architecture</a></li>
              <li><a href="#metrics" className="hover:text-white hover:translate-x-1 transition-all duration-300 block">Live Metrics</a></li>
              <li><a href="#team" className="hover:text-white hover:translate-x-1 transition-all duration-300 block">Team</a></li>
            </ul>
          </div>
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-9 flex flex-col min-w-0">
          
          {/* Hero Section */}
          <motion.section 
            id="hero" 
            className="pt-12 md:pt-20 pb-8 relative docs-section max-w-none"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={sectionVariants}
          >
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.03] rounded-full blur-[120px] pointer-events-none"></div>
            
            <div className="relative z-10">
              <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 bg-gradient-to-br from-white via-gray-200 to-gray-600 bg-clip-text text-transparent">
                {config.site_title}
              </h1>
              <p className="text-2xl text-zinc-400 max-w-[700px] leading-relaxed mb-6 font-medium">
                {config.hero_tagline}
              </p>
              <div className="inline-block px-4 py-2 border border-white/10 bg-white/5 rounded-full backdrop-blur-sm text-sm font-medium text-zinc-300">
                Built for Bangladeshi STEM students using curriculum-aware AI and adaptive retrieval.
              </div>
            </div>
          </motion.section>

          {/* Dynamic Sections */}
          {sections.map((sec: any) => (
            <React.Fragment key={sec.id}>
              <div className="section-divider" />
              <motion.section 
                id={`section-${sec.id}`} 
                className="docs-section docs-section-spacing"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={sectionVariants}
              >
              <div className="docs-markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {sec.content_markdown || "No content."}
                </ReactMarkdown>
              </div>
            </motion.section>
          </React.Fragment>
        ))}

          <div className="section-divider" />

          {/* Architecture Visualizer */}
          <DocsWideSection id="architecture">
            <h2 className="text-3xl font-bold tracking-tight mb-8">System Architecture</h2>
            <div className="p-4 md:p-8 rounded-2xl bg-[#111111] border border-white/5 shadow-[0_0_40px_rgba(255,255,255,0.02)] overflow-hidden">
              <Suspense fallback={<div className="h-[700px] flex items-center justify-center text-gray-500"><Loader className="animate-spin" /></div>}>
                <ArchitectureView />
              </Suspense>
            </div>
          </DocsWideSection>

          <div className="section-divider" />

          {/* Live Metrics */}
          <DocsWideSection id="metrics">
            <h2 className="text-3xl font-bold tracking-tight mb-2">Live Platform Metrics</h2>
            <p className="text-zinc-400 mb-12">Real-time operational statistics directly from the production database.</p>
            {liveStats && (
              <div className="space-y-12">
                <div>
                  <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-6">Platform Usage & Scale</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {[
                      { label: "Active Users", value: liveStats.total_users },
                      { label: "Conversations", value: liveStats.conversations },
                      { label: "Exams Generated", value: liveStats.adaptive_exams_generated },
                      { label: "OCR Jobs", value: liveStats.ocr_jobs_completed },
                    ].map((stat, i) => (
                      <motion.div whileHover={{ y: -4 }} key={i} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 shadow-lg flex flex-col justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <span className="text-4xl font-bold text-white mb-2 relative z-10">{stat.value}</span>
                        <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold relative z-10">{stat.label}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-6">AI & Infrastructure</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {[
                      { label: "Documents RAG'd", value: liveStats.documents_processed },
                      { label: "Vector DB Size", value: `${liveStats.vector_db_size_mb}MB` },
                      { label: "RAG Chunks", value: liveStats.rag_chunks },
                      { label: "Avg Latency", value: `${liveStats.avg_response_time_ms}ms` },
                    ].map((stat, i) => (
                      <motion.div whileHover={{ y: -4 }} key={i} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 shadow-lg flex flex-col justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <span className="text-4xl font-bold text-white mb-2 relative z-10">{stat.value}</span>
                        <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold relative z-10">{stat.label}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DocsWideSection>

          <div className="section-divider" />

          {/* Team Showcase */}
          <DocsWideSection id="team" className="pb-24">
            <div className="mb-12 max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Core Contributors</h2>
              <p className="text-zinc-400 text-lg leading-relaxed">
                Built by a multidisciplinary team spanning AI systems engineering, curriculum intelligence, and high-performance infrastructure.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {team.map((member: any) => (
                <motion.div 
                  whileHover={{ y: -4 }}
                  key={member.id} 
                  className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center flex flex-col items-center hover:bg-white/[0.04] transition-colors group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="w-24 h-24 mb-5 rounded-full overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-900 border-2 border-white/10 shadow-xl"
                  >
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={member.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-zinc-600 bg-zinc-900">
                        {member.full_name.charAt(0)}
                      </div>
                    )}
                  </motion.div>
                  
                  <h3 className="font-bold text-xl text-white mb-1">{member.full_name}</h3>
                  <div className="inline-flex items-center justify-center px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full mb-4">
                    <p className="text-[11px] text-amber-500 font-bold uppercase tracking-wider">{member.role}</p>
                  </div>
                  
                  {member.email && <p className="text-sm text-zinc-500 mb-6">{member.email}</p>}
                  
                  <div className="flex items-center gap-3 mt-auto relative z-10">
                    {member.github_url && (
                      <a href={member.github_url} target="_blank" rel="noreferrer" className="p-2 bg-white/5 rounded-full hover:bg-white/20 transition-colors text-zinc-400 hover:text-white">
                        <Github size={16} />
                      </a>
                    )}
                    {member.linkedin_url && (
                      <a href={member.linkedin_url} target="_blank" rel="noreferrer" className="p-2 bg-white/5 rounded-full hover:bg-white/20 transition-colors text-zinc-400 hover:text-white">
                        <Linkedin size={16} />
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </DocsWideSection>

        </main>
      </DocsContainer>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white !important; color: black !important; }
          .bg-\\[\\#0a0a0a\\], .bg-\\[\\#111111\\] { background: white !important; }
          .text-white, .text-\\[\\#f5f5f5\\] { color: black !important; }
          .text-gray-400, .text-gray-500 { color: #333 !important; }
          .border-\\[\\#1f1f1f\\], .border-\\[\\#333\\] { border-color: #ddd !important; }
          .print\\:hidden { display: none !important; }
        }
      `}} />
    </div>
  );
}
