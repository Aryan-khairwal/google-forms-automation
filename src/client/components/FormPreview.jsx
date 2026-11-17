import React from "react";
import {
  Clock,
  Briefcase,
  CheckCircle2,
  Play,
  RotateCw,
  Terminal,
  ShieldCheck,
  Plus,
  Trash2
} from "lucide-react";

export default function FormPreview({
  formData,
  onUpdateFormData,
  onRunAutomation,
  running,
  autoSubmit,
  onToggleAutoSubmit,
  logs = [],
  availableProjects = []
}) {
  if (!formData) {
    return (
      <div className="h-full bg-white rounded-2xl shadow-sm border border-slate-200/80 p-8 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 mb-4">
          <Briefcase className="w-8 h-8" />
        </div>
        <h3 className="font-semibold text-slate-700 text-base mb-1">No Day Plan Yet</h3>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-4">
          Type your day plan in the chat (e.g. <span className="font-mono text-slate-600 bg-slate-100 px-1 py-0.5 rounded">File AI 5:30 UI enhancements, Learning 3h NB</span>) and the AI will generate structured day plan inputs with office defaults.
        </p>
      </div>
    );
  }

  const updateField = (field, val) => {
    onUpdateFormData({ ...formData, [field]: val });
  };

  const updateProject = (idx, field, val) => {
    const updated = [...(formData.projects || [])];
    if (updated[idx]) {
      updated[idx] = { ...updated[idx], [field]: val };
      onUpdateFormData({ ...formData, projects: updated });
    }
  };

  const addProject = () => {
    const projects = formData.projects || [];
    if (projects.length >= 2) return;
    onUpdateFormData({
      ...formData,
      projects: [...projects, { name: availableProjects[0] || "", planned: "00:00", billable: "00:00", ebhEquivalent: false, tasks: "" }],
      anotherProject: "No"
    });
  };

  const removeProject = (idx) => {
    const projects = (formData.projects || []).filter((_, projectIndex) => projectIndex !== idx);
    onUpdateFormData({ ...formData, projects, anotherProject: "No" });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center font-semibold">
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Generated Day Plan Inputs</h2>
            <p className="text-xs text-slate-400">Review or tweak your planned day before running Playwright</p>
          </div>
        </div>

        {/* Total Working Hours Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded-xl text-xs font-semibold">
          <Clock className="w-3.5 h-3.5 text-emerald-600" />
          <span>Total:</span>
          <input
            type="text"
            value={formData.totalWork || "08:30"}
            onChange={(e) => updateField("totalWork", e.target.value)}
            className="w-14 text-center bg-white border border-emerald-300 rounded px-1 py-0.5 text-xs font-mono font-bold text-emerald-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Form Content Scrollable */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Projects</h3>
            <p className="text-xs text-slate-400">Add up to two projects planned for today.</p>
          </div>
          <button type="button" onClick={addProject} disabled={(formData.projects || []).length >= 2} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40">
            <Plus className="w-3.5 h-3.5" /> Add project
          </button>
        </div>

        {(formData.projects || []).length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">Add a project to enter your planned hours and tasks.</div>
        )}

        {/* Projects List */}
        {(formData.projects || []).map((proj, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/50 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                Project {idx + 1}
              </span>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input type="checkbox" checked={Boolean(proj.ebhEquivalent)} onChange={(e) => updateProject(idx, "ebhEquivalent", e.target.checked)} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                  <span className={`font-medium ${proj.ebhEquivalent ? "text-emerald-700 font-semibold" : "text-slate-500"}`}>EB Equivalent</span>
                </label>
                <button type="button" onClick={() => removeProject(idx)} className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition hover:text-rose-600" aria-label={`Remove project ${idx + 1}`}>
                  <Trash2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Remove</span>
                </button>
              </div>
            </div>

            {/* Project Select */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Project Name
              </label>
              <select
                value={proj.name}
                onChange={(e) => updateProject(idx, "name", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {availableProjects.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Planned & Billable Hours */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Hours Planned
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={proj.planned || "00:00"}
                    onChange={(e) => updateProject(idx, "planned", e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="05:00"
                  />
                  <Clock className="w-3 h-3 text-slate-400 absolute right-2.5 top-2.5" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Billable Hours
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={proj.billable || "00:00"}
                    onChange={(e) => updateProject(idx, "billable", e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="05:00"
                  />
                  <Clock className="w-3 h-3 text-slate-400 absolute right-2.5 top-2.5" />
                </div>
              </div>
            </div>

            {/* Tasks to be done */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Tasks to be done
              </label>
              <textarea
                rows={2}
                value={proj.tasks || ""}
                onChange={(e) => updateProject(idx, "tasks", e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                placeholder="Description of planned tasks to be done..."
              />
            </div>
          </div>
        ))}

        {/* Blocker & Other Settings */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-600 mb-1">
              Any blocker? (Final Section)
            </label>
            <input
              type="text"
              value={formData.blocker || "None"}
              onChange={(e) => updateField("blocker", e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Live Logs Container (Visible when running or logs exist) */}
        {logs.length > 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 text-slate-200 p-3 text-xs font-mono space-y-1 max-h-40 overflow-y-auto">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">
              <Terminal className="w-3 h-3" />
              <span>Playwright Live Output</span>
            </div>
            {logs.map((log, lidx) => (
              <div key={lidx} className="leading-tight text-slate-300">
                {log}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col gap-3">
        {/* Auto Submit Toggle */}
        <div className="flex items-center justify-between text-xs text-slate-600 px-1">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">Auto-Submit after filling</span>
          </div>
          <button
            type="button"
            onClick={onToggleAutoSubmit}
            className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer ${
              autoSubmit ? "bg-emerald-600 justify-end" : "bg-slate-300 justify-start"
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-white shadow-xs"></div>
          </button>
        </div>

        {/* Confirm and Run Button */}
        <button
          onClick={onRunAutomation}
          disabled={running}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.99] disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          {running ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin" />
              <span>Automating Playwright Day Plan...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Confirm & Fill Day Plan with Playwright</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

