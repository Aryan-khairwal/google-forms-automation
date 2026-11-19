export const FULL_DAY_SECONDS = 8.5 * 60 * 60;

export function durationSeconds(value) {
  if (typeof value !== "string" || !/^\d{1,2}:[0-5]\d(?::[0-5]\d)?$/.test(value)) return null;
  const [hours, minutes, seconds = 0] = value.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

export function totalSpentSeconds(projects) {
  if (!Array.isArray(projects) || projects.length === 0) return null;
  const durations = projects.map((project) => durationSeconds(project?.spent));
  return durations.includes(null) ? null : durations.reduce((sum, duration) => sum + duration, 0);
}

export function formatDuration(seconds) {
  const parts = [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60)];
  if (seconds % 60) parts.push(seconds % 60);
  return parts.map((part) => String(part).padStart(2, "0")).join(":");
}
