export const PAID_CASUAL_LEAVE = "Casual leave (Paid)";

function blank(value) {
  return value == null || (typeof value === "string" && value.trim() === "");
}

export function withLeaveDefaults(data) {
  const paidCasual = data.leaveType === PAID_CASUAL_LEAVE;
  const coverage = paidCasual && blank(data.coverage) ? "None" : data.coverage;
  const workComplete = paidCasual && blank(data.workComplete) ? "No" : data.workComplete;
  const singleDate = typeof data.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.startDate) &&
    (blank(data.endDate) || data.endDate === data.startDate);
  const days = singleDate && blank(data.days) ? "1" : data.days;
  if (coverage === data.coverage && workComplete === data.workComplete && days === data.days) return data;
  return { ...data, coverage, workComplete, days };
}
