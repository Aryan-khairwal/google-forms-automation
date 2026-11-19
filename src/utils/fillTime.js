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

async function fillTime(page, questionTitle, rawTime, { allowBlank = false } = {}) {
  const time = parseTime(rawTime);
  const blank = allowBlank && rawTime === "";
  const question = getQuestion(page, questionTitle);
  await question.waitFor({ state: "visible" });

  for (const [label, value] of [["Hours", time.hours], ["Minutes", time.minutes], ["Seconds", time.seconds]]) {
    await question.locator(`input[aria-label="${label}"]`).fill(blank ? "" : String(value).padStart(2, "0"));
  }
}

module.exports = { fillTime, parseTime };
