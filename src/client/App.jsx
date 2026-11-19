import React, { useState, useEffect, useRef } from "react";
import { Settings, CheckCircle2, AlertCircle, PanelLeft } from "lucide-react";
import ChatPanel from "./components/ChatPanel";
import ConversationHistory from "./components/ConversationHistory";
import FormPreview from "./components/FormPreview";
import OtherFormPreview from "./components/OtherFormPreview";
import SettingsModal from "./components/SettingsModal";
import useConversationHistory from "./useConversationHistory";
import formTemplates from "../config/formTemplates.json";
import { localDate } from "../utils/localDate.mjs";
import { durationSeconds } from "../utils/statusHours.mjs";
import { statusProjectsFromCheckin } from "../utils/statusFromCheckin.mjs";
import evolvanLogo from "../../assets/branding/evolvan-logo-dark.svg?no-inline";

const DESKTOP_HISTORY = "(min-width: 1280px)";
const EMPTY_MESSAGES = [];
const EMPTY_STATUS = { projects: [{}] };
const EMPTY_LEAVE = {};

function hasSavedWork(chat, today) {
  const data = chat.formData;
  const type = chat.formId ?? "checkin";
  if (type === "status") {
    if (!data?.date) return false;
  } else if (type !== "checkin" || localDate(new Date(chat.updatedAt)) !== today) {
    return false;
  }

  const hoursField = type === "status" ? "spent" : "planned";
  return Array.isArray(data?.projects) && data.projects.length > 0 && data.projects.every((project) => (
    project?.name && typeof project.tasks === "string" && project.tasks.trim() && durationSeconds(project[hoursField]) !== null
  ));
}

export default function App() {
  const [config, setConfig] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(() => window.matchMedia(DESKTOP_HISTORY).matches);
  const activeProvider = config?.providers[config.provider];
  const history = useConversationHistory();
  const { activeId, activeChat } = history;
  const [draftFormId, setDraftFormId] = useState("checkin");
  const savedFormId = activeChat?.formId ?? "checkin";
  const formId = activeChat ? (Object.hasOwn(formTemplates, savedFormId) ? savedFormId : "checkin") : draftFormId;
  const Preview = formId === "checkin" ? FormPreview : OtherFormPreview;
  const messages = activeChat?.messages ?? EMPTY_MESSAGES;

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

  const [pendingChats, setPendingChats] = useState([]);
  const pendingRequests = useRef(new Set());
  const loadingChat = pendingChats.includes(activeId);
  const [defaultFormData, setDefaultFormData] = useState(null);
  const formData = activeChat?.formData ?? (formId === "checkin" ? defaultFormData : formId === "status" ? EMPTY_STATUS : EMPTY_LEAVE);
  const [checkinReceipt, setCheckinReceipt] = useState(null);
  const canOfferToday = formId === "status" && !formData.date && messages.length === 0;
  const [autoSubmit, setAutoSubmit] = useState(false);
  const [runningAutomation, setRunningAutomation] = useState(false);
  const [automation, setAutomation] = useState({ chatId: null, logs: [] });
  const [toast, setToast] = useState(null);

  // Fetch initial config
  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config");
      if (!res.ok) throw new Error("Could not load AI settings.");
      const data = await res.json();
      setConfig(data);

      if (data.defaultConfig) {
        setDefaultFormData({ ...data.defaultConfig, projects: [] });
      }

      if (!data.hasApiKey) {
        setIsSettingsOpen(true);
      }
    } catch (err) {
      showToast("error", err.message);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    if (!canOfferToday) return;
    const controller = new AbortController();
    fetch("/api/checkin/today", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .catch(() => null)
      .then((receipt) => {
        if (!controller.signal.aborted) setCheckinReceipt({ ...receipt, chatId: activeId });
      });
    return () => controller.abort();
  }, [activeId, canOfferToday]);

  useEffect(() => {
    try {
      localStorage.setItem("checkin-quick-prompts", JSON.stringify(quickPrompts));
    } catch {
      // Hints can still be used when storage is unavailable.
    }
  }, [quickPrompts]);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const changeConversation = (select) => {
    select();
    setAutoSubmit(false);
    if (!window.matchMedia(DESKTOP_HISTORY).matches) setHistoryOpen(false);
  };

  const startConversation = (nextFormId) => {
    setDraftFormId(nextFormId);
    changeConversation(history.newConversation);
  };

  const today = localDate(new Date());
  const todayReceipt = checkinReceipt?.chatId === activeId && checkinReceipt.date === today ? checkinReceipt : null;
  const todayOffer = canOfferToday && (
    todayReceipt || history.conversations.some((chat) => chat.id !== activeId && hasSavedWork(chat, today))
  ) ? today : null;

  const startTodayStatus = () => {
    if (!todayOffer || checkinReceipt?.chatId !== activeId) return;
    const savedCheckin = history.conversations.find((chat) => (
      (chat.formId ?? "checkin") === "checkin" && hasSavedWork(chat, today)
    ));
    const checkinProjects = todayReceipt?.projects?.length ? todayReceipt.projects : savedCheckin?.formData.projects;

    history.updateConversation(activeId, (chat) => {
      const draft = chat.formData ?? EMPTY_STATUS;
      if (chat.messages.length || draft.date) return chat;
      const hasProjectEdits = draft.projects?.some((project) => project && Object.values(project).some(Boolean));
      const imported = checkinProjects?.length > 0 && !hasProjectEdits;
      const projects = imported ? statusProjectsFromCheckin(checkinProjects) : draft.projects;
      return {
        ...chat,
        formId: "status",
        formData: { ...draft, date: todayOffer, projects },
        messages: [...chat.messages, {
          role: "assistant",
          localOnly: true,
          content: imported
            ? "I used the planned tasks and hours from today’s Daily Check-in. Please review what you completed and the hours you actually worked or billed. What changed?"
            : "Today’s date is set. What work did you complete, and how much time did you spend?"
        }]
      };
    }, true);
  };

  const handleSendMessage = async (userText) => {
    const chatId = activeId;
    if (!activeProvider || pendingRequests.current.has(chatId)) return;
    if (!activeProvider.hasApiKey) {
      setIsSettingsOpen(true);
      return;
    }

    const userMessage = { role: "user", content: userText };
    pendingRequests.current.add(chatId);
    setPendingChats((previous) => [...previous, chatId]);
    const chat = history.updateConversation(chatId, (previous) => ({
      ...previous,
      formId,
      messages: [...previous.messages, userMessage]
    }), true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chat.messages.filter((message) => !message.isError && !message.localOnly),
          provider: config.provider,
          model: activeProvider.model,
          formId,
          currentPlan: chat.formData
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process message with AI.");
      }

      history.updateConversation(chatId, (previous) => ({
        ...previous,
        formData: data.formData || previous.formData,
        messages: [...previous.messages, {
          role: "assistant",
          content: (data.needsClarification && data.clarificationQuestion) || data.message || "Form preview updated.",
          needsClarification: Boolean(data.needsClarification)
        }]
      }));
    } catch (err) {
      history.updateConversation(chatId, (previous) => ({
        ...previous,
        messages: [...previous.messages, {
          role: "assistant",
          content: err.message,
          isError: true
        }]
      }));
    } finally {
      pendingRequests.current.delete(chatId);
      setPendingChats((previous) => previous.filter((pendingId) => pendingId !== chatId));
    }
  };

  // Handle running Playwright automation
  const handleRunAutomation = async () => {
    if (!formData || runningAutomation) return;
    const chatId = activeId;
    setRunningAutomation(true);
    setAutomation({ chatId, logs: ["[Triggered] Launching Playwright automation..."] });

    let finished = false;
    // Start log polling
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/logs");
        const logData = await res.json();
        if (finished) return;
        if (Array.isArray(logData.logs)) {
          setAutomation({ chatId, logs: logData.logs });
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
          formId,
          autoSubmit
        })
      });

      const data = await res.json();
      if (Array.isArray(data.logs)) {
        setAutomation({ chatId, logs: data.logs });
      }

      if (!res.ok) {
        throw new Error(data.error || "Form automation failed.");
      }

      showToast("success", data.message || "Form filled successfully!");
    } catch (err) {
      showToast("error", err.message);
    } finally {
      finished = true;
      clearInterval(pollInterval);
      setRunningAutomation(false);
    }
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-slate-100 text-slate-800">
      {/* Top Navbar */}
      <header className="min-h-16 bg-white border-b border-slate-200/80 px-4 py-3 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            title="Conversation history"
            aria-label="Conversation history"
            aria-expanded={historyOpen}
            aria-controls={historyOpen ? "conversation-history" : undefined}
            onClick={() => setHistoryOpen(!historyOpen)}
            className="shrink-0 rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            <PanelLeft className="h-5 w-5" />
          </button>
          <h1 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-brand-600 sm:text-2xl">
            <img src={evolvanLogo} alt="" width="36" height="36" className="h-9 w-9 shrink-0" />
            AutoForm
          </h1>
        </div>

        {/* Status & Settings */}
        <div className="flex items-center gap-3">
          {activeProvider && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <span className={`w-2 h-2 rounded-full ${activeProvider.hasApiKey ? "bg-emerald-500" : "bg-amber-500"}`}></span>
              <span className="font-medium">{activeProvider.label} · {activeProvider.hasApiKey ? activeProvider.model : "API key needed"}</span>
            </div>
          )}

          <button
            onClick={() => setIsSettingsOpen(true)}
            disabled={!config}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span>Settings</span>
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {historyOpen && (
          <>
            <button
              type="button"
              aria-label="Close conversation history"
              onClick={() => setHistoryOpen(false)}
              className="absolute inset-0 z-10 bg-slate-900/25 xl:hidden"
            />
            <ConversationHistory
              conversations={history.conversations}
              activeId={activeId}
              storageError={history.storageError}
              onSelect={(id) => changeConversation(() => history.selectConversation(id))}
              onNew={() => startConversation(formId)}
              onDelete={(id) => {
                history.deleteConversation(id);
                if (id === activeId) setAutoSubmit(false);
              }}
            />
          </>
        )}

        <main className="flex-1 min-w-0 max-w-7xl mx-auto overflow-y-auto p-3 sm:p-5 lg:min-h-0 lg:overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
          <section className="h-[520px] lg:col-span-5 lg:h-full lg:min-h-0 overflow-hidden">
            <ChatPanel
              key={activeId}
              formId={formId}
              messages={messages}
              onSendMessage={handleSendMessage}
              loading={loadingChat}
              ready={Boolean(activeProvider?.hasApiKey)}
              statusDate={formId === "status" ? formData.date : undefined}
              todayOffer={todayOffer}
              checkingToday={canOfferToday && checkinReceipt?.chatId !== activeId}
              onStartTodayStatus={startTodayStatus}
              onQuickPrompt={handleSendMessage}
              quickPrompts={formId === "checkin" ? quickPrompts : []}
              formSelector={
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  <span className="sr-only">Form to fill</span>
                  <select
                    value={formId}
                    onChange={(event) => startConversation(event.target.value)}
                    className="max-w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {Object.entries(formTemplates).map(([id, template]) => (
                      <option key={id} value={id}>{template.label}</option>
                    ))}
                  </select>
                </label>
              }
            />
          </section>

          <section className="min-h-[620px] lg:col-span-7 lg:h-full lg:min-h-0 overflow-hidden">
            <Preview
              formId={formId}
              formData={formData}
              onUpdateFormData={(updated) => {
                history.updateConversation(activeId, (chat) => ({ ...chat, formId, formData: updated }), true);
              }}
              onRunAutomation={handleRunAutomation}
              running={runningAutomation}
              autoSubmit={autoSubmit}
              onToggleAutoSubmit={() => setAutoSubmit(!autoSubmit)}
              logs={automation.chatId === activeId ? automation.logs : []}
              availableProjects={config?.availableProjects || []}
            />
          </section>
        </main>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && config && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          activeProvider={config.provider}
          providers={config.providers}
          quickPrompts={quickPrompts}
          onQuickPromptsChange={setQuickPrompts}
          onSave={({ provider, providers }) => {
            setConfig((prev) => ({ ...prev, provider, providers }));
            setIsSettingsOpen(false);
            showToast("success", `${providers[provider].label} is active.`);
          }}
        />
      )}

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

