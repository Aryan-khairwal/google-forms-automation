const { status, leave } = require("../config/formTemplates.json");
const projects = require("../config/projects.json");
const { maxProjects } = require("../config/dayPlan.json");
const { FULL_DAY_SECONDS, durationSeconds, totalSpentSeconds } = require("../utils/statusHours.mjs");
const { withLeaveDefaults } = require("../utils/leaveDefaults.mjs");

function isDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().startsWith(value + "T");
}

function hasText(value) {
  return typeof value === "string" && value.trim() !== "";
}

function getCheckinQuestion(data, focusedIndex = -1) {
  if (!Array.isArray(data.projects) || data.projects.length === 0) {
    return "Which project will you work on first?";
  }
  if (data.projects.length > maxProjects) {
    return `Which ${maxProjects} projects should I include? Extra work can go in Project ${maxProjects}'s tasks.`;
  }
  const focused = data.projects[focusedIndex];
  if (hasText(focused?.tasks) && durationSeconds(focused.planned) === null) {
    return `How much time will you work on Project ${focusedIndex + 1}?`;
  }
  if (hasText(focused?.tasks) && !projects.includes(focused.name)) {
    return `Which project should I select for Project ${focusedIndex + 1}?`;
  }
  for (const [index, project] of data.projects.entries()) {
    const label = `Project ${index + 1}`;
    if (!projects.includes(project?.name)) return `Which project should I select for ${label}?`;
    if (!hasText(project.tasks)) return `What will you work on for ${label}?`;
    if (durationSeconds(project.planned) === null) return `How much time will you work on ${label}?`;
    if (project.billable != null && project.billable !== "" && durationSeconds(project.billable) === null) {
      return `How much billable time should I enter for ${label}?`;
    }
  }
  if (data.totalWork && durationSeconds(data.totalWork) === null) return "How many hours will you work in total?";
  return null;
}

function getStatusValidationError(data) {
  if (!isDate(data.date)) return "What is the status date?";
  if (!Array.isArray(data.projects) || data.projects.length === 0 || data.projects.length > maxProjects) {
    return data.projects?.length > maxProjects
      ? `Which ${maxProjects} projects should I include in Daily Status?`
      : "Which project did you work on first?";
  }
  for (const [index, project] of data.projects.entries()) {
    const label = `Project ${index + 1}`;
    if (!projects.includes(project?.name)) return `Which project should I select for ${label}?`;
    if (!hasText(project.tasks)) return `What work did you complete for ${label}?`;
    const spent = durationSeconds(project.spent);
    if (spent === null) return `How much time did you spend on ${label}?`;
    const billed = durationSeconds(project.billed);
    if ((index === 0 || (project.billed != null && project.billed !== "")) && billed === null) {
      return `How many hours did you bill for ${label}?`;
    }
    if (project.equivalent != null && project.equivalent !== "" && durationSeconds(project.equivalent) === null) {
      return `How many equivalent billable hours should I enter for ${label}?`;
    }
    if (billed !== null && Math.abs(spent - billed) > 600 && !hasText(project.reason)) {
      return `Why do hours spent and hours billed differ by more than 10 minutes for ${label}?`;
    }
  }
  if (totalSpentSeconds(data.projects) !== FULL_DAY_SECONDS && !status.reasons.includes(data.totalReason)) {
    return "What is the reason for the total hours differing from 8:30?";
  }
  return null;
}

const leaveQuestions = {
  name: "What name should I put on the leave application?",
  leaveType: "Which type of leave are you requesting?",
  days: "How many days of leave are you requesting?",
  startDate: "When should the leave start?",
  reason: "What reason should I enter for the leave?",
  coverage: "Who will cover your responsibilities while you’re away?",
  workComplete: "Have you covered or completed your work for that day?"
};

function getLeaveValidationError(draft) {
  const data = withLeaveDefaults(draft);
  for (const field of leave.fields) {
    const value = data[field.id];
    if (value != null && typeof value !== "string") return `Enter a valid value for ${field.label}.`;
    if (field.id === "days" && !hasText(value) && !hasText(data.startDate)) return leaveQuestions.startDate;
    if (field.required && !hasText(value)) return leaveQuestions[field.id];
    if (field.id === "endDate" && Number(data.days) > 1 && (!value || value <= data.startDate)) {
      return "What is the end date of your multi-day leave?";
    }
    if (!hasText(value)) continue;
    if (field.options && !field.options.includes(value)) return `Choose a valid option for ${field.label}.`;
    if (field.type === "date" && !isDate(value)) return `Enter a valid date for ${field.label}.`;
    if (field.type === "number" && (!/^\d*\.?\d+$/.test(value.trim()) || !Number.isFinite(Number(value)) || Number(value) <= 0)) {
      return "Enter a positive number of leave days.";
    }
  }
  if (data.endDate && data.endDate < data.startDate) return "The end date cannot be before the start date.";
  return null;
}

module.exports = { getCheckinQuestion, getStatusValidationError, getLeaveValidationError };
