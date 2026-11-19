import React, { useState } from "react";
import { Key, Sparkles, X, AlertCircle, Plus, Trash2 } from "lucide-react";

const KEY_URLS = {
  gemini: "https://aistudio.google.com/app/apikey",
  openai: "https://platform.openai.com/api-keys"
};

export default function SettingsModal({ onClose, activeProvider, providers, onSave, quickPrompts = [], onQuickPromptsChange }) {
  const [provider, setProvider] = useState(activeProvider);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(providers[activeProvider].model);
  const [isCustomModel, setIsCustomModel] = useState(() =>
    !providers[activeProvider].models.includes(providers[activeProvider].model)
  );
  const [saving, setSaving] = useState(false);
  const [keyTest, setKeyTest] = useState(null);
  const [error, setError] = useState(null);
  const [newPrompt, setNewPrompt] = useState("");
  const { label, hasApiKey, models } = providers[provider];
  const testing = keyTest?.status === "testing";
  const busy = saving || testing;
  const canTest = model.trim() && (apiKey.trim() || hasApiKey);
  const settingsBody = () => JSON.stringify({ provider, apiKey: apiKey.trim(), model: model.trim() });

  const handleProviderChange = (event) => {
    const nextProvider = event.target.value;
    const nextSettings = providers[nextProvider];
    setProvider(nextProvider);
    setApiKey("");
    setModel(nextSettings.model);
    setIsCustomModel(!nextSettings.models.includes(nextSettings.model));
    setError(null);
    setKeyTest(null);
  };

  const handleTestKey = async () => {
    if (busy || !canTest) return;
    setKeyTest({ status: "testing", message: `Testing with ${label}…` });
    try {
      const res = await fetch("/api/test-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: settingsBody()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not test the API key.");
      setKeyTest({ status: "success", message: data.message });
    } catch (err) {
      setKeyTest({ status: "error", message: err.message });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/save-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: settingsBody()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save AI settings.");
      onSave(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="settings-title" className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 bg-gradient-to-r from-brand-700 to-brand-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-lg">
              <Key className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 id="settings-title" className="font-semibold text-lg leading-tight">AI Settings</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            aria-label="Close settings"
            className="p-1 rounded-lg text-brand-100 hover:text-white hover:bg-white/10 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="ai-provider" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              AI provider
            </label>
            <select
              id="ai-provider"
              value={provider}
              onChange={handleProviderChange}
              disabled={busy}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white transition"
            >
              {Object.entries(providers).map(([id, info]) => <option key={id} value={id}>{info.label}</option>)}
            </select>
            <p className="text-xs text-slate-500 mt-1.5">When you send a message, the selected provider receives this chat and its form preview.</p>
          </div>

          <div>
            <label htmlFor="provider-key" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              {label} API key
            </label>
            <input
              id="provider-key"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(event) => {
                setApiKey(event.target.value);
                setKeyTest(null);
              }}
              placeholder={hasApiKey ? "Key configured. Leave blank to keep it." : "Enter an API key"}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 font-mono transition"
              disabled={busy}
              required={!hasApiKey}
            />
            <a href={KEY_URLS[provider]} target="_blank" rel="noreferrer" className="inline-block text-xs text-brand-700 mt-1.5 underline">Get a {provider === "openai" ? "OpenAI" : "Gemini"} API key</a>
          </div>

          <div>
            <label htmlFor="provider-model" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Model
            </label>
            <select
              id="provider-model"
              value={isCustomModel ? "" : model}
              onChange={(event) => {
                const selectedModel = event.target.value;
                setIsCustomModel(selectedModel === "");
                setModel(selectedModel);
                setKeyTest(null);
              }}
              disabled={busy}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white transition"
            >
              {models.map((name) => <option key={name} value={name}>{name}</option>)}
              <option value="">Custom model…</option>
            </select>
            {isCustomModel && (
              <div className="mt-2">
                <label htmlFor="custom-model" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Custom model ID
                </label>
                <input
                  id="custom-model"
                  value={model}
                  onChange={(event) => {
                    setModel(event.target.value);
                    setKeyTest(null);
                  }}
                  disabled={busy}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition"
                />
              </div>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={handleTestKey}
              disabled={busy || !canTest}
              aria-describedby="test-key-details"
              className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800 transition hover:bg-brand-100 disabled:opacity-50"
            >
              {testing ? "Testing API key…" : "Test API key"}
            </button>
            <p id="test-key-details" className="mt-1.5 text-xs text-slate-500">
              Sends a short request to the selected model. This may use API quota.
            </p>
            <div aria-live="polite">
              {keyTest && (
                <p className={`mt-2 text-xs ${keyTest.status === "error" ? "text-rose-700" : keyTest.status === "success" ? "text-emerald-700" : "text-slate-600"}`}>
                  {keyTest.message}
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Chat hints</label>
            </div>
            <p className="text-xs text-slate-400 mb-3">These small suggestion pills appear before the first message.</p>
            <div className="space-y-2 mb-3">
              {quickPrompts.map((prompt, index) => (
                <div key={`${prompt}-${index}`} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  <span className="min-w-0 flex-1 break-words">{prompt}</span>
                  <button type="button" onClick={() => onQuickPromptsChange?.(quickPrompts.filter((_, promptIndex) => promptIndex !== index))} className="shrink-0 text-slate-400 hover:text-rose-600" aria-label={`Remove hint ${index + 1}`}><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (newPrompt.trim()) { onQuickPromptsChange?.([...quickPrompts, newPrompt.trim()]); setNewPrompt(""); } } }} placeholder="e.g. File AI 5h UI tasks, Learning 3h NB..." className="min-w-0 flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500" />
              <button type="button" onClick={() => { if (newPrompt.trim()) { onQuickPromptsChange?.([...quickPrompts, newPrompt.trim()]); setNewPrompt(""); } }} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"><Plus className="w-3.5 h-3.5" /> Add</button>
            </div>
          </div>

          {error && (
            <div role="alert" className="p-3 rounded-xl text-xs flex items-center gap-2 bg-rose-50 text-rose-700 border border-rose-200">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2 rounded-xl text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/30 transition flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

