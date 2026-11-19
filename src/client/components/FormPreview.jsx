import React from "react";
import { AutomationActions, AutomationLogs } from "./AutomationControls";
import { maxProjects } from "../../config/dayPlan.json";
import {
  Clock,
  Briefcase,
  CheckCircle2,
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

  const projects = formData.projects || [];

  const addProject = () => {
    if (projects.length >= maxProjects) return;
    onUpdateFormData({
      ...formData,
      projects: [...projects, { name: "", planned: "", billable: null, ebhEquivalent: false, tasks: "" }]
    });
  };

  const removeProject = (idx) => {
    onUpdateFormData({ ...formData, projects: projects.filter((_, projectIndex) => projectIndex !== idx) });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-600 flex items-center justify-center font-semibold">
            <CheckCircle2 className="w-4 h-4 text-brand-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Generated Day Plan Inputs</h2>
            <p className="text-xs text-slate-400">Review or tweak your planned day before running Playwright</p>
          </div>
        </div>

        {/* Total Working Hours Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-800 border border-brand-200/60 rounded-xl text-xs font-semibold">
          <Clock className="w-3.5 h-3.5 text-brand-600" />
          <span>Total:</span>
          <input
            type="text"
            value={formData.totalWork || "08:30"}
            onChange={(e) => updateField("totalWork", e.target.value)}
            className="w-14 text-center bg-white border border-brand-300 rounded px-1 py-0.5 text-xs font-mono font-bold text-brand-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Form Content Scrollable */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Projects</h3>
            <p className="text-xs text-slate-400">Add up to {maxProjects} projects planned for today.</p>
          </div>
          <button type="button" onClick={addProject} disabled={projects.length >= maxProjects} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-40">
            <Plus className="w-3.5 h-3.5" /> Add project
          </button>
        </div>

        {projects.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">Add a project to enter your planned hours and tasks.</div>
        )}

        {/* Projects List */}
        {projects.map((proj, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/50 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-brand-600" />
                Project {idx + 1}
              </span>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input type="checkbox" checked={Boolean(proj.ebhEquivalent)} onChange={(e) => updateProject(idx, "ebhEquivalent", e.target.checked)} className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                  <span className={`font-medium ${proj.ebhEquivalent ? "text-brand-700 font-semibold" : "text-slate-500"}`}>EB Equivalent</span>
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
                value={proj.name ?? ""}
                onChange={(e) => updateProject(idx, "name", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="">Choose a project</option>
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
                <label htmlFor={`planned-hours-${idx}`} className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Hours Planned
                </label>
                <div className="relative">
                  <input
                    id={`planned-hours-${idx}`}
                    type="text"
                    value={proj.planned ?? ""}
                    onChange={(e) => updateProject(idx, "planned", e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    placeholder="05:00"
                  />
                  <Clock className="w-3 h-3 text-slate-400 absolute right-2.5 top-2.5" />
                </div>
              </div>
              <div>
                <label htmlFor={`billable-hours-${idx}`} className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Billable Hours
                </label>
                <div className="relative">
                  <input
                    id={`billable-hours-${idx}`}
                    type="text"
                    value={proj.billable ?? proj.planned ?? ""}
                    onChange={(e) => updateProject(idx, "billable", e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                  <Clock className="w-3 h-3 text-slate-400 absolute right-2.5 top-2.5" />
                </div>
              </div>
            </div>

            {/* Tasks to be done */}
            <div>
              <label htmlFor={`project-tasks-${idx}`} className="block text-[11px] font-semibold text-slate-400 mb-1">
                Tasks to be done
              </label>
              <textarea
                id={`project-tasks-${idx}`}
                rows={idx === maxProjects - 1 ? 4 : 2}
                value={proj.tasks || ""}
                onChange={(e) => updateProject(idx, "tasks", e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                placeholder="Description of planned tasks to be done..."
              />
              {idx === maxProjects - 1 && (
                <p className="mt-1 text-xs text-slate-500">Use separate headings here for work on additional projects.</p>
              )}
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
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        <AutomationLogs logs={logs} />
      </div>

      <AutomationActions
        onRunAutomation={onRunAutomation}
        running={running}
        autoSubmit={autoSubmit}
        onToggleAutoSubmit={onToggleAutoSubmit}
        disabled={projects.length === 0 || projects.length > maxProjects}
        buttonLabel="Confirm & Fill Day Plan with Playwright"
      />
    </div>
  );
}

