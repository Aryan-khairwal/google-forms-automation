import React, { useState, useEffect } from "react";
import { Sparkles, Settings, CheckCircle2, AlertCircle } from "lucide-react";
import ChatPanel from "./components/ChatPanel";
import FormPreview from "./components/FormPreview";
import SettingsModal from "./components/SettingsModal";

export default function App() {
  const [config, setConfig] = useState(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [currentModel, setCurrentModel] = useState("gemini-3.8-flash");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [messages, setMessages] = useState([]);
  const [quickPrompts, setQuickPrompts] = useState(() => {
    try {
      const saved = localStorage.getItem("checkin-quick-prompts");
      return saved ? JSON.parse(saved) : [
        "File AI 5:30 UI enhancements, AI Bid 3 hrs EB MCP integration",
        "File AI 5h frontend tasks, Learning 3:30 NB explore AI workflows"
      ];
    } catch {
      return [];
    }
  });

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
              billable: "05:00",
              ebhEquivalent: false,
              tasks: "Work on frontend development, fix UI issues, and review pending tasks."
            },
            {
              name: "Evolvan-AI Bid Writing",
              planned: "03:30",
              billable: "03:30",
              ebhEquivalent: false,
              tasks: "Work on assigned development tasks and test latest changes."
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

  useEffect(() => {
    localStorage.setItem("checkin-quick-prompts", JSON.stringify(quickPrompts));
  }, [quickPrompts]);

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
          content: data.message || "Day plan generated.",
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
    <div className="flex h-[100dvh] flex-col bg-slate-100 text-slate-800">
      {/* Top Navbar */}
      <header className="min-h-16 bg-white border-b border-slate-200/80 px-4 py-3 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold shadow-sm shadow-emerald-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base text-slate-900 leading-tight">
              Google Form Day Plan Agent
            </h1>
            <p className="hidden text-xs text-slate-400 sm:block">Morning day plan & check-in automation</p>
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
      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-5 lg:min-h-0 lg:overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
        {/* Left: Chat Panel (5 Cols) */}
        <section className="h-[520px] lg:col-span-5 lg:h-full lg:min-h-0 overflow-hidden">
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            loading={loadingChat}
            onQuickPrompt={(text) => handleSendMessage(text)}
            quickPrompts={quickPrompts}
          />
        </section>

        {/* Right: Form Data Preview & Controls (7 Cols) */}
        <section className="min-h-[620px] lg:col-span-7 lg:h-full lg:min-h-0 overflow-hidden">
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
        quickPrompts={quickPrompts}
        onQuickPromptsChange={setQuickPrompts}
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

