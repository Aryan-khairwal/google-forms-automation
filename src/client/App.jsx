import React, { useState, useEffect } from "react";
import { Sparkles, Settings, CheckCircle2, AlertCircle, Key, RefreshCw } from "lucide-react";
import ChatPanel from "./components/ChatPanel";
import FormPreview from "./components/FormPreview";
import SettingsModal from "./components/SettingsModal";

export default function App() {
  const [config, setConfig] = useState(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [currentModel, setCurrentModel] = useState("gemini-3.8-flash");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "👋 Hi Aryan! I'm your Google Form daily check-in assistant.\n\nTell me what you worked on today (e.g. \"FileAI 5:30 UI enhancements, AI Bid 3 hrs MCP Integration\"). I will parse your input, set your office defaults (8:30 total hours, billable = planned, no blockers), and prepare the form for you."
    }
  ]);

  const [loadingChat, setLoadingChat] = useState(false);
  const [formData, setFormData] = useState(null);
  const [autoSubmit, setAutoSubmit] = useState(false);
  const [runningAutomation, setRunningAutomation] = useState(false);
  const [automationLogs, setAutomationLogs] = useState([]);
  const [toast, setToast] = useState(null);

  // Fetch initial config
  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      setConfig(data);
      setHasApiKey(data.hasApiKey);
      if (data.model) setCurrentModel(data.model);

      // Pre-seed with default form data
      if (data.defaultConfig) {
        setFormData({
          ...data.defaultConfig,
          projects: [
            {
              name: "File AI",
              planned: "05:00",
              billable: "04:30",
              ebhEquivalent: true,
              tasks: "Worked on frontend development, fixed UI issues, and reviewed the pending tasks."
            },
            {
              name: "Evolvan-AI Bid Writing",
              planned: "03:30",
              billable: "03:30",
              ebhEquivalent: true,
              tasks: "Worked on assigned development tasks and bug fixes."
            }
          ]
        });
      }

      if (!data.hasApiKey) {
        setIsSettingsOpen(true);
      }
    } catch (err) {
      console.error("Config fetch error:", err);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // Handle sending chat message to LangChain Gemini Agent
  const handleSendMessage = async (userText) => {
    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setLoadingChat(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          model: currentModel
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process message with AI.");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message || "Form data generated.",
          needsClarification: Boolean(data.needsClarification)
        }
      ]);

      if (data.formData) {
        setFormData(data.formData);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Error: ${err.message}. If you haven't set your Gemini API key, click Settings in the top right to configure it.`,
          needsClarification: true
        }
      ]);
    } finally {
      setLoadingChat(false);
    }
  };

  // Handle running Playwright automation
  const handleRunAutomation = async () => {
    if (!formData) return;
    setRunningAutomation(true);
    setAutomationLogs(["[Triggered] Launching Playwright automation..."]);

    // Start log polling
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/logs");
        const logData = await res.json();
        if (logData.logs) {
          setAutomationLogs(logData.logs);
        }
        if (!logData.isRunning) {
          clearInterval(pollInterval);
        }
      } catch (e) {}
    }, 1000);

    try {
      const res = await fetch("/api/fill-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formData,
          autoSubmit
        })
      });

      const data = await res.json();
      clearInterval(pollInterval);

      if (!res.ok) {
        throw new Error(data.error || "Form automation failed.");
      }

      setAutomationLogs(data.logs || []);
      showToast("success", data.message || "Form filled successfully!");
    } catch (err) {
      clearInterval(pollInterval);
      showToast("error", err.message);
    } finally {
      setRunningAutomation(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100 text-slate-800">
      {/* Top Navbar */}
      <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold shadow-sm shadow-emerald-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base text-slate-900 leading-tight">
              Google Form Check-in Agent
            </h1>
            <p className="text-xs text-slate-400">
              LangChain Gemini 3.8 / 3.5 • Playwright Automation
            </p>
          </div>
        </div>

        {/* Status & Settings */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <span className={`w-2 h-2 rounded-full ${hasApiKey ? "bg-emerald-500" : "bg-amber-500"}`}></span>
            <span className="font-medium">{hasApiKey ? currentModel : "No API Key"}</span>
          </div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer shadow-2xs"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span>Settings</span>
          </button>
        </div>
      </header>

      {/* Main Workspace (Split View) */}
      <main className="flex-1 overflow-hidden p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-7xl w-full mx-auto">
        {/* Left: Chat Panel (5 Cols) */}
        <section className="lg:col-span-5 h-full overflow-hidden">
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            loading={loadingChat}
            onQuickPrompt={(text) => handleSendMessage(text)}
          />
        </section>

        {/* Right: Form Data Preview & Controls (7 Cols) */}
        <section className="lg:col-span-7 h-full overflow-hidden">
          <FormPreview
            formData={formData}
            onUpdateFormData={setFormData}
            onRunAutomation={handleRunAutomation}
            running={runningAutomation}
            autoSubmit={autoSubmit}
            onToggleAutoSubmit={() => setAutoSubmit(!autoSubmit)}
            logs={automationLogs}
            availableProjects={config?.availableProjects || []}
          />
        </section>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentModel={currentModel}
        onSave={(newModel) => {
          setHasApiKey(true);
          setCurrentModel(newModel);
        }}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-in slide-in-from-bottom-5 duration-200 ${
            toast.type === "success"
              ? "bg-emerald-600 text-white border-emerald-500"
              : "bg-rose-600 text-white border-rose-500"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}

