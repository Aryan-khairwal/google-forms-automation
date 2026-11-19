import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, HelpCircle } from "lucide-react";
import formTemplates from "../../config/formTemplates.json";

const DAILY_CHECK_IN_EXAMPLE = [
  "Total work 08:00.",
  "CultBooking.com: 04:00 planned, 04:00 billable. Work on the assigned tickets and review pending merge requests.",
  "Restro Automation: 04:00 planned. Leave billable hours blank. Work on the assigned Restro ticket.",
  "No additional projects."
].join("\n");

export default function ChatPanel({
  formId,
  formSelector,
  messages,
  onSendMessage,
  loading,
  ready,
  statusDate,
  todayOffer,
  checkingToday,
  onStartTodayStatus,
  onQuickPrompt,
  quickPrompts = []
}) {
  const [input, setInput] = useState("");
  const [declinedToday, setDeclinedToday] = useState(false);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const offerToday = formId === "status" && todayOffer && !declinedToday;
  let openingQuestion = "What name should I put on the leave application?";
  if (formId === "status") {
    openingQuestion = statusDate ? "What did you work on?" : "What date is this status for?";
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || loading || !ready) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !e.nativeEvent.isComposing) {
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
      {/* Panel Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-600 flex items-center justify-center font-semibold text-sm">
            <Sparkles className="w-4 h-4 text-brand-600" />
          </div>
          <div>
            {formSelector}
            <p className="text-xs text-slate-500">{formTemplates[formId].description}</p>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !loading && formId === "checkin" && (
          <div className="pt-4 sm:pt-8 max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-slate-800">What's on your plate today?</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Start with a project or task. I’ll ask for missing details. Billable hours default to planned hours (use <span className="font-mono text-brand-700 bg-brand-50 px-1 py-0.5 rounded">NB</span> or <span className="font-mono text-brand-700 bg-brand-50 px-1 py-0.5 rounded">billable 0</span> for non-billable, or <span className="font-mono text-brand-700 bg-brand-50 px-1 py-0.5 rounded">EB</span> for equivalent billable).
            </p>
            <button
              type="button"
              aria-label="Use Daily Check-in example"
              onClick={() => {
                setInput(DAILY_CHECK_IN_EXAMPLE);
                inputRef.current?.focus();
              }}
              className="mt-4 w-full rounded-xl border border-brand-200 bg-brand-50 p-3 text-left text-xs text-brand-900 transition hover:bg-brand-100"
            >
              <span className="block font-semibold">Use Daily Check-in example</span>
              <span className="mt-1 block whitespace-pre-line leading-relaxed">{DAILY_CHECK_IN_EXAMPLE}</span>
            </button>
            {quickPrompts.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {quickPrompts.map((prompt, index) => (
                  <button
                    key={`${prompt}-${index}`}
                    onClick={() => onQuickPrompt(prompt)}
                    disabled={!ready}
                    className="max-w-full rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-left text-xs text-brand-800 transition hover:bg-brand-100 disabled:opacity-50"
                  >
                    <span className="line-clamp-2">{prompt}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {offerToday && messages.length === 0 && !loading && (
          <div className="flex gap-3" aria-live="polite">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700" aria-hidden="true">
              <Bot className="h-4 w-4" />
            </div>
            <div className="min-w-0 max-w-[85%]">
              <p id="today-status-question" className="rounded-2xl rounded-bl-xs bg-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-800">
                Would you like to fill out today’s Daily Status?
              </p>
              <div role="group" aria-labelledby="today-status-question" className="mt-2 flex flex-col items-start gap-2">
                <button
                  type="button"
                  disabled={checkingToday}
                  onClick={() => {
                    onStartTodayStatus();
                    inputRef.current?.focus();
                  }}
                  className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-800 hover:bg-brand-100 disabled:opacity-50"
                >
                  Yes, use today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeclinedToday(true);
                    inputRef.current?.focus();
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  No, choose another date
                </button>
              </div>
            </div>
          </div>
        )}
        {messages.length === 0 && !loading && formId !== "checkin" && !offerToday && (
          <div className="pt-4 sm:pt-8 max-w-md mx-auto">
            <h3 id="chat-opening-question" aria-live="polite" className="text-lg font-semibold text-slate-800">{openingQuestion}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">Share what you have. I’ll ask for any missing details.</p>
          </div>
        )}
        {messages.map((msg, index) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={index}
              className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0 text-xs font-semibold shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-xs ${
                  isUser
                    ? "bg-brand-600 text-white rounded-br-xs"
                    : msg.isError
                    ? "bg-rose-50 text-rose-800 border border-rose-200 rounded-bl-xs"
                    : msg.needsClarification
                    ? "bg-amber-50 text-amber-900 border border-amber-200 rounded-bl-xs"
                    : "bg-slate-100 text-slate-800 rounded-bl-xs"
                }`}
              >
                {msg.needsClarification && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 mb-1">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Next question</span>
                  </div>
                )}
                <div className="whitespace-pre-wrap leading-relaxed">
                  {typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)}
                </div>
              </div>
              {isUser && (
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center flex-shrink-0 text-xs font-semibold">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="bg-slate-100 rounded-2xl px-4 py-3 rounded-bl-xs text-sm text-slate-500 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: "0ms" }}></div>
              <div className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: "150ms" }}></div>
              <div className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: "300ms" }}></div>
              <span className="text-xs text-slate-400 ml-1">Analyzing instructions...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-200 bg-white flex gap-2 items-end">
        <textarea
          ref={inputRef}
          rows={3}
          aria-label="Message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={formId === "checkin"
            ? "e.g. File AI 5h UI tasks, Learning 3:30 NB study AI workflows"
            : formId === "status"
              ? statusDate ? "Enter your completed work and hours…" : "Enter the status date, completed work, and hours…"
              : "Enter the leave request details…"}
          className="min-w-0 max-h-48 flex-1 resize-y px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition"
        />
        <button
          type="submit"
          aria-label="Send message"
          title="Send message (Ctrl or ⌘ + Enter)"
          disabled={!input.trim() || loading || !ready}
          className="p-2.5 rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 transition shadow-xs flex items-center justify-center shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

