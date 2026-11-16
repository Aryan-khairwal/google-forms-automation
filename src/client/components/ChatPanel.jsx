import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, HelpCircle, ArrowRight } from "lucide-react";

export default function ChatPanel({
  messages,
  onSendMessage,
  loading,
  onQuickPrompt
}) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const quickPrompts = [
    "FileAI 5:30 UI enhancements, AI Bid 3 hrs MCP Integration",
    "FileAI 4:30 EB frontend redesign, AI Bid 4h unit tests",
    "FileAI 8:30 full day bug fixes and documentation",
    "Total 8h, FileAI 5h UI tasks, AI Bid 3h not billable research"
  ];

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
      {/* Panel Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-semibold text-sm">
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Check-in AI Assistant</h2>
            <p className="text-xs text-slate-400">Powered by LangChain & Gemini</p>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={index}
              className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 text-xs font-semibold shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-xs ${
                  isUser
                    ? "bg-emerald-600 text-white rounded-br-xs"
                    : msg.needsClarification
                    ? "bg-amber-50 text-amber-900 border border-amber-200 rounded-bl-xs"
                    : "bg-slate-100 text-slate-800 rounded-bl-xs"
                }`}
              >
                {msg.needsClarification && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 mb-1">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Clarification Needed</span>
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
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="bg-slate-100 rounded-2xl px-4 py-3 rounded-bl-xs text-sm text-slate-500 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "0ms" }}></div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "150ms" }}></div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "300ms" }}></div>
              <span className="text-xs text-slate-400 ml-1">Analyzing instructions...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/40">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-emerald-500" />
          <span>Quick Example Prompts</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => onQuickPrompt(qp)}
              className="text-xs px-2.5 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200 rounded-lg text-slate-600 transition flex items-center gap-1 text-left"
            >
              <span className="truncate max-w-[220px]">{qp}</span>
              <ArrowRight className="w-3 h-3 opacity-40 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-200 bg-white flex gap-2 items-center">
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. FileAI 5:30 UI enhancements, AI Bid 3 hrs MCP Integration"
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-none transition"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition shadow-xs flex items-center justify-center shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

