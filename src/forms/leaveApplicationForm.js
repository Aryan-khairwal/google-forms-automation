const { leave } = require("../config/formTemplates.json");
const { getQuestion } = require("../utils/getQuestion");
const { getLeaveValidationError } = require("./formValidation");
const { confirmEmail, selectOption } = require("./googleFormControls");
const { withLeaveDefaults } = require("../utils/leaveDefaults.mjs");

async function fillLeaveApplication(page, draft, onProgress = () => {}) {
  const data = withLeaveDefaults(draft);
  const error = getLeaveValidationError(data);
  if (error) throw new Error(error);
  onProgress("Opening Leave Application...");
  await page.goto(leave.url, { waitUntil: "domcontentloaded" });
  await confirmEmail(page, onProgress);

  for (const { id, label, type } of leave.fields) {
    const question = getQuestion(page, label);
    const value = data[id] ?? "";
    onProgress(`Filling ${label}`);
    try {
      if (type === "select") {
        await selectOption(page, label, value);
      } else if (type === "date") {
        await question.locator('input[type="date"]').fill(value);
      } else {
        await question.locator('input[type="text"], input[type="number"], textarea').fill(value);
      }
    } catch {
      throw new Error(`Could not fill ${label}. Check the open Leave Application.`);
    }
  }
  onProgress("Leave application ready for review. Add any attachment in Google Forms before submitting.");
  return { success: true, submitted: false };
}

module.exports = { fillLeaveApplication };
