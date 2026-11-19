import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { status, leave } from "../../config/formTemplates.json";
import { maxProjects } from "../../config/dayPlan.json";
import { FULL_DAY_SECONDS, totalSpentSeconds, formatDuration } from "../../utils/statusHours.mjs";
import { withLeaveDefaults } from "../../utils/leaveDefaults.mjs";
import { AutomationActions, AutomationLogs } from "./AutomationControls";

const inputClass = "block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-slate-100";

function PreviewField({ label, value = "", onChange, type = "text", options, required = false, disabled = false }) {
  const props = {
    value, disabled, "aria-label": label, "aria-required": required,
    onChange: (event) => onChange(event.target.value), className: inputClass
  };
  return (
    <label className="grid gap-1 text-xs font-semibold text-slate-600">
      <span>{label}{required && <span aria-hidden="true" className="ml-1 text-rose-600">*</span>}</span>
      {options ? (
        <select {...props}>
          <option value="">Choose</option>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : type === "textarea" ? (
        <textarea {...props} rows={3} />
      ) : (
        <input {...props} type={type} step={type === "number" ? "any" : undefined} />
      )}
    </label>
  );
}

function StatusFields({ data, update, availableProjects }) {
  const projects = data.projects || [];
  const total = totalSpentSeconds(projects);
  const fullDay = total === FULL_DAY_SECONDS;
  const reasonNeeded = total !== null && !fullDay && !status.reasons.includes(data.totalReason);

  function updateProject(index, field, value) {
    update("projects", projects.map((project, projectIndex) => (
      projectIndex === index ? { ...project, [field]: value } : project
    )));
  }

  return (
    <>
      <PreviewField label="Status date" type="date" value={data.date} onChange={(value) => update("date", value)} required />
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-800">Projects</h3>
        <button
          type="button"
          onClick={() => update("projects", [...projects, {}])}
          disabled={projects.length >= maxProjects}
          className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" /> Add project
        </button>
      </div>
      {projects.map((project, index) => {
        const fields = [
          { id: "name", label: "Project name", options: availableProjects, required: true },
          { id: "tasks", label: "Tasks done", type: "textarea", required: true },
          { id: "spent", label: "Hours spent (HH:MM)", required: true },
          { id: "billed", label: "Hours billed (HH:MM)", required: index === 0 },
          { id: "equivalent", label: "Equivalent billable hours (HH:MM)" },
          { id: "reason", label: "Reason if spent and billed differ by more than 10 minutes", type: "textarea" }
        ];
        return (
          <fieldset key={index} className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
            <legend className="px-1 text-xs font-semibold text-slate-700">Project {index + 1}</legend>
            {fields.map(({ id, ...field }) => (
              <div key={id} className={field.type === "textarea" || id === "name" ? "sm:col-span-2" : ""}>
                <PreviewField {...field} value={project[id]} onChange={(value) => updateProject(index, id, value)} />
              </div>
            ))}
            <div className="flex justify-end sm:col-span-2">
              <button
                type="button"
                aria-label={`Remove project ${index + 1}`}
                onClick={() => update("projects", projects.filter((_, projectIndex) => projectIndex !== index))}
                className="p-1.5 text-slate-500 hover:text-rose-700"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </fieldset>
        );
      })}
      <div className="rounded-xl bg-brand-50 p-3 text-sm font-semibold text-brand-900">
        Total hours spent {total === null ? "—" : formatDuration(total)}
        {(fullDay || reasonNeeded) && <span className="ml-2 font-normal">· {fullDay ? "Full day" : "Reason needed"}</span>}
      </div>
      <PreviewField
        label="Reason for total hours"
        value={fullDay ? status.fullDayReason : status.reasons.includes(data.totalReason) ? data.totalReason : ""}
        options={fullDay ? [status.fullDayReason] : status.reasons}
        disabled={fullDay}
        required={!fullDay}
        onChange={(value) => update("totalReason", value)}
      />
      <PreviewField label="What did you learn?" type="textarea" value={data.learning} onChange={(value) => update("learning", value)} />
      <PreviewField label="Comments or feedback" type="textarea" value={data.feedback} onChange={(value) => update("feedback", value)} />
    </>
  );
}

export default function OtherFormPreview({ formId, formData, availableProjects, onUpdateFormData, logs, ...actions }) {
  const isLeave = formId === "leave";
  const template = isLeave ? leave : status;
  const preview = isLeave ? withLeaveDefaults(formData) : formData;
  const update = (key, value) => onUpdateFormData({ ...formData, [key]: value });

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
        <h2 className="text-sm font-bold text-slate-800">{template.label} preview</h2>
        <p className="mt-1 text-xs text-slate-500">Review and edit these answers before filling the form.</p>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        {isLeave ? (
          <>
            {leave.fields.map(({ id, ...field }) => (
              <PreviewField key={id} {...field} value={preview[id]} onChange={(value) => update(id, value)} />
            ))}
            <p className="text-xs text-slate-600">Add any supporting document directly in Google Forms before you submit.</p>
          </>
        ) : (
          <StatusFields data={formData} update={update} availableProjects={availableProjects} />
        )}
        <AutomationLogs logs={logs} />
      </div>
      <AutomationActions
        {...actions}
        disabled={!isLeave && !formData.projects?.length}
        onToggleAutoSubmit={isLeave ? undefined : actions.onToggleAutoSubmit}
        buttonLabel={isLeave ? "Fill Leave Application for review" : "Fill Daily Status"}
      />
    </div>
  );
}
