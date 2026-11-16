const { getQuestion } = require("./getQuestion");

async function fillTime(page, questionTitle, time) {
  const question = getQuestion(page, questionTitle);
  await question.waitFor({ state: "visible" });

  await question
    .locator('input[aria-label="Hours"]')
    .fill(String(time.hours).padStart(2, "0"));
  await question
    .locator('input[aria-label="Minutes"]')
    .fill(String(time.minutes).padStart(2, "0"));
  await question
    .locator('input[aria-label="Seconds"]')
    .fill(String(time.seconds).padStart(2, "0"));
}

module.exports = { fillTime };
