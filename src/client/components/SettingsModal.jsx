import React, { useState } from "react";
import { Key, Sparkles, Check, X, AlertCircle } from "lucide-react";

export default function SettingsModal({ isOpen, onClose, currentModel, onSave }) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(currentModel || "gemini-3.8-flash");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/save-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim(), model })
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: "API key and model saved successfully!" });
        onSave?.(model);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setMsg({ type: "error", text: data.error || "Failed to save API key" });
      }
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-lg">
              <Key className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-lg leading-tight">Gemini AI Settings</h2>
              <p className="text-xs text-emerald-100">Configure your API Key & Model</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Google Gemini API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-mono transition"
              required
            />
            <p className="text-xs text-slate-400 mt-1.5">
              Get your free key from Google AI Studio (aistudio.google.com).
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Model Selection
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white transition"
            >
              <option value="gemini-3.8-flash">Gemini 3.8 Flash (Recommended)</option>
              <option value="gemini-3.8-flash-lite">Gemini 3.8 Flash Lite</option>
              <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
              <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite</option>
              <option value="gemini-flash-latest">Gemini Flash Latest</option>
              <option value="gemini-flash-lite-latest">Gemini Flash Lite Latest</option>
            </select>
          </div>

          {msg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                msg.type === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {msg.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{msg.text}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/30 transition flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Key"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

