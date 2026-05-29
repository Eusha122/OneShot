import React, { useState, useEffect } from "react";
import { Loader, Lock, Save, Link, WifiOff, RefreshCw } from "lucide-react";
import { API_BASE_URL } from "../../lib/chatApi";

export function AdminDocsPanel() {
  const [token, setToken] = useState(localStorage.getItem("oneshot_docs_admin") || "");
  const [password, setPassword] = useState("");
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [backendOnline, setBackendOnline] = useState(true);

  useEffect(() => {
    checkBackend();
    if (token) {
      loadConfig();
    }
  }, [token]);

  const checkBackend = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`);
      setBackendOnline(res.ok);
    } catch {
      setBackendOnline(false);
    }
  };

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/docs/admin/config`, {
        headers: { "x-admin-token": token }
      });
      if (res.status === 401) {
        setToken("");
        localStorage.removeItem("oneshot_docs_admin");
        return;
      }
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      setError("Failed to load admin config. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/docs/admin/login?password=${password}`, {
        method: "POST"
      });
      if (res.ok) {
        setToken(password);
        localStorage.setItem("oneshot_docs_admin", password);
      } else {
        setError("Invalid password");
      }
    } catch (err) {
      setError("Server error — check if backend is running.");
    }
  };

  const saveConfig = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/docs/admin/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token
        },
        body: JSON.stringify({
          is_public: config.is_public
        })
      });
      if (res.ok) alert("Saved!");
    } catch (err) {
      alert("Error saving.");
    }
  };

  if (!backendOnline) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
        <div className="text-center max-w-sm space-y-6 p-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
            <WifiOff size={32} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold">Backend Offline</h2>
          <p className="text-gray-400 text-sm">Unable to connect to backend API.</p>
          <p className="text-xs text-gray-600">Expected at: <code className="text-gray-500">{API_BASE_URL}</code></p>
          <button
            onClick={() => { checkBackend(); }}
            className="inline-flex items-center gap-2 px-6 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition"
          >
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
        <form onSubmit={handleLogin} className="p-8 bg-[#111] rounded-2xl border border-[#333] max-w-sm w-full">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Lock size={24} />
            </div>
          </div>
          <h2 className="text-xl font-bold text-center mb-6">Admin Access</h2>
          {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}
          <input
            type="password"
            placeholder="Enter password..."
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 mb-4 text-white outline-none focus:border-amber-500 transition"
          />
          <button type="submit" className="w-full bg-white text-black font-semibold rounded-lg py-2 hover:bg-gray-200 transition">
            Login
          </button>
        </form>
      </div>
    );
  }

  if (loading || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
        <Loader className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex justify-between items-center pb-6 border-b border-[#1f1f1f]">
          <h1 className="text-3xl font-bold">Docs System Admin</h1>
          <div className="flex items-center gap-4">
            <a href="/docs" target="_blank" className="text-gray-400 hover:text-white flex items-center gap-2">
              <Link size={16} /> View Live Docs
            </a>
            <button onClick={() => { setToken(""); localStorage.removeItem("oneshot_docs_admin"); }} className="px-4 py-2 rounded border border-[#333] text-sm hover:bg-[#1a1a1a]">
              Logout
            </button>
          </div>
        </header>

        <section className="p-6 bg-[#111] border border-[#1f1f1f] rounded-xl space-y-6">
          <h2 className="text-xl font-semibold">Publishing Controls</h2>
          
          <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg border border-[#333]">
            <div>
              <h3 className="font-medium text-white">Public Visibility</h3>
              <p className="text-sm text-gray-400">If enabled, the /docs route will be public immediately, overriding the schedule.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={config.is_public || false} onChange={e => setConfig({...config, is_public: e.target.checked})} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <button onClick={saveConfig} className="flex items-center gap-2 px-6 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition">
            <Save size={18} /> Save Settings
          </button>
        </section>

        <section className="p-6 bg-[#111] border border-[#1f1f1f] rounded-xl space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Database Seed Note</h2>
          </div>
          <p className="text-gray-400 text-sm">
            For the hackathon, we will seed the DB directly with the YC Pitch sections via a backend script or SQLite viewer rather than building a full WYSIWYG editor here, to save time and focus on the beautiful presentation layer!
          </p>
        </section>

      </div>
    </div>
  );
}
