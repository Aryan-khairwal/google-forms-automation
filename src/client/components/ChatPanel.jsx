import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, HelpCircle } from "lucide-react";

export default function ChatPanel({
  messages,
  onSendMessage,
  loading,
  onQuickPrompt,
  quickPrompts = []
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

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
      {/* Panel Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-semibold text-sm">
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Describe your day</h2>
            <p className="text-xs text-slate-400">The form updates after each message</p>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="pt-4 sm:pt-8 max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-slate-800">What's on your plate?</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">Write a short summary with your projects, time, and tasks. Choose a hint to get started.</p>
            {quickPrompts.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {quickPrompts.map((prompt, index) => (
                  <button
                    key={`${prompt}-${index}`}
                    onClick={() => onQuickPrompt(prompt)}
                    className="max-w-full rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-left text-xs text-emerald-800 transition hover:bg-emerald-100"
                  >
                    <span className="line-clamp-2">{prompt}</span>
                  </button>
                ))}
              </div>
            )}
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

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-200 bg-white flex gap-2 items-center">
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Restro 4:30 EB, Assigned Tickets"
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

