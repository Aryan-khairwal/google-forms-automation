const { status } = require("../config/formTemplates.json");
const { getQuestion } = require("../utils/getQuestion");
const { fillTime } = require("../utils/fillTime");
const { normalizeTaskText } = require("../utils/normalizeTaskText");
const { FULL_DAY_SECONDS, totalSpentSeconds } = require("../utils/statusHours.mjs");
const { maxProjects } = require("../config/dayPlan.json");
const { getStatusValidationError } = require("./formValidation");
const { ensureAriaChecked, selectOption, advanceToSection, confirmEmail, finishForm } = require("./googleFormControls");

const BRANCH_QUESTION = "You have another project for status today?";
const TOTAL_QUESTION = "Is total of";
const REASON_QUESTION = "If answer to above question is";

async function fillDailyStatus(page, data, onProgress = () => {}) {
  const error = getStatusValidationError(data);
  if (error) throw new Error(error);
  onProgress("Opening Daily Status...");
  await page.goto(status.url, { waitUntil: "domcontentloaded" });
  await confirmEmail(page, onProgress);
  await getQuestion(page, "Status of Day.").locator('input[type="date"]').fill(data.date);

  for (const [index, project] of data.projects.entries()) {
    const number = index + 1;
    const section = `Project ${number}`;
    onProgress(`Filling Daily Status ${section}: ${project.name}`);
    await selectOption(page, `${section} name`, project.name);
    await getQuestion(page, `Tasks done (${number})`).getByRole("textbox").fill(normalizeTaskText(project.tasks));
    await fillTime(page, `Hours Spent (${number})`, project.spent);
    await fillTime(page, `Hours Billed (${number})`, project.billed ?? "", { allowBlank: true });
    await fillTime(page, `Equivalent billable hours (${number})`, project.equivalent ?? "", { allowBlank: true });
    await getQuestion(page, "Reason if Hours Spent").getByRole("textbox").fill(project.reason ?? "");

    const more = number < data.projects.length;
    if (number < maxProjects) {
      await ensureAriaChecked(getQuestion(page, BRANCH_QUESTION).getByRole("radio", { name: more ? "Yes" : "No", exact: true }));
    }
    const next = more ? `Project ${number + 1}` : "Final";
    const nextQuestion = getQuestion(page, more ? `${next} name` : TOTAL_QUESTION);
    await advanceToSection(page, section, next, nextQuestion, onProgress);
  }

  onProgress("Filling Daily Status totals and feedback...");
  const fullDay = totalSpentSeconds(data.projects) === FULL_DAY_SECONDS;
  await getQuestion(page, "You learned something new today?").getByRole("textbox").fill(data.learning ?? "");
  await ensureAriaChecked(getQuestion(page, TOTAL_QUESTION).getByRole("radio", { name: fullDay ? "Yes" : "No", exact: true }));
  await selectOption(page, REASON_QUESTION, fullDay ? status.fullDayReason : data.totalReason);
  await getQuestion(page, "Any other comments/Feedback").getByRole("textbox").fill(data.feedback ?? "");
  return finishForm(page, data.autoSubmit, onProgress);
}

module.exports = { fillDailyStatus };
