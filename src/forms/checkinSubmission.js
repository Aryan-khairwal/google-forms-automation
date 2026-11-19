const fs = require("node:fs");
const { getSubmissionConfirmation } = require("./googleFormControls");
const { localDate } = require("../utils/localDate.mjs");
const { localPath } = require("../config/localPaths");

const RECEIPT = ".daily-checkin-date";

function getTodayCheckin(now = new Date()) {
  try {
    const today = localDate(now);
    const saved = fs.readFileSync(localPath(RECEIPT), "utf8").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(saved)) {
      return { date: saved === today ? today : null };
    }
    const receipt = JSON.parse(saved);
    return receipt?.date === today ? receipt : { date: null };
  } catch (error) {
    if (error.code === "ENOENT") return { date: null };
    throw error;
  }
}

function recordCheckinSubmission(projects, now = new Date()) {
  try {
    const receipt = {
      date: localDate(now),
      projects: projects.map(({ name, tasks, planned, billable, ebhEquivalent }) => (
        { name, tasks, planned, billable, ebhEquivalent }
      ))
    };
    fs.writeFileSync(localPath(RECEIPT), JSON.stringify(receipt), { mode: 0o600 });
  } catch (error) {
    console.error(`Could not save the Daily Check-in submission date (${error.code}).`);
  }
}

function watchCheckinSubmission(page, { formUrl, projects }) {
  const form = new URL(formUrl);
  const responsePath = form.pathname.replace(/\/viewform$/, "/formResponse");

  async function checkConfirmation() {
    const current = new URL(page.url());
    const currentPath = current.pathname.replace(/^\/forms\/u\/\d+\//, "/forms/");
    if (current.origin !== form.origin || currentPath !== responsePath) return;

    const now = new Date();
    const confirmed = await getSubmissionConfirmation(page).isVisible().catch(() => false);
    if (confirmed) {
      page.off("domcontentloaded", checkConfirmation);
      recordCheckinSubmission(projects, now);
    }
  }

  page.on("domcontentloaded", checkConfirmation);
  return checkConfirmation();
}

module.exports = { getTodayCheckin, recordCheckinSubmission, watchCheckinSubmission };
