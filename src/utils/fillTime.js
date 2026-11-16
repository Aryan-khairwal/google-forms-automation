const { getQuestion } = require("./getQuestion");

function parseTime(time) {
  if (!time) {
    return { hours: 0, minutes: 0, seconds: 0 };
  }
  if (typeof time === "object" && "hours" in time) {
    return {
      hours: Number(time.hours) || 0,
      minutes: Number(time.minutes) || 0,
      seconds: Number(time.seconds) || 0
    };
  }
  if (typeof time === "string") {
    const parts = time.trim().split(":").map((p) => Number(p.trim()));
    return {
      hours: parts[0] || 0,
      minutes: parts[1] || 0,
      seconds: parts[2] || 0
    };
  }
  if (typeof time === "number") {
    const hours = Math.floor(time);
    const minutes = Math.round((time - hours) * 60);
    return { hours, minutes, seconds: 0 };
  }
  return { hours: 0, minutes: 0, seconds: 0 };
}

async function fillTime(page, questionTitle, rawTime) {
  const time = parseTime(rawTime);
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

module.exports = { fillTime, parseTime };
