const assert = require("node:assert/strict");
const { before, after, test } = require("node:test");
const { chromium } = require("playwright");
const { status, leave } = require("../src/config/formTemplates.json");
const { processUserMessage } = require("../src/agent/formAgent");
const { fillDailyStatus } = require("../src/forms/dailyStatusForm");
const { fillLeaveApplication } = require("../src/forms/leaveApplicationForm");
const { getStatusValidationError, getLeaveValidationError } = require("../src/forms/formValidation");
const { withLeaveDefaults } = require("../src/utils/leaveDefaults.mjs");

const statusData = {
  date: "2026-11-18",
  projects: [
    { name: "File AI", tasks: "Reviewed the layout.", spent: "03:00", billed: "03:00" },
    { name: "Learning", tasks: "Read documentation.", spent: "01:00", billed: "00:00", reason: "Training time" },
    { name: "Giga", tasks: "Reviewed the site.", spent: "00:30", billed: "" },
    { name: "Restro Automation", tasks: "Tested inventory.", spent: "04:00", equivalent: "04:00" }
  ],
  learning: "Learned the inventory flow.",
  feedback: "No feedback."
};

const leaveData = {
  name: "Sample Teammate", leaveType: "Half day leave (Morning)", days: "0.5",
  startDate: "2026-11-20", endDate: "", reason: "Appointment", coverage: "Sample Colleague",
  workComplete: "Yes", comments: ""
};
const paidCasualDraft = { ...leaveData, leaveType: "Casual leave (Paid)", days: "", coverage: "", workComplete: "" };

let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); });

function question(title, input) {
  return `<div role="listitem"><h2>${title}</h2>${input}</div>`;
}

function select(options) {
  return `<div role="listbox" aria-expanded="false" tabindex="0" style="min-height:20px">Choose
    ${options.map((option) => `<button role="option" hidden>${option}</button>`).join("")}</div>`;
}

function radio() {
  return ["Yes", "No"].map((answer) => `<button role="radio" aria-checked="false">${answer}</button>`).join("");
}

function duration(title) {
  return question(title, ["Hours", "Minutes", "Seconds"].map((label) => `<input aria-label="${label}" value="11">`).join(""));
}

const email = '<button role="checkbox" aria-checked="false">Record example@test.invalid as the email to be included with my response</button>';
const controlScript = `<script>
  window.visits = [];
  window.submitCount = 0;
  document.addEventListener("click", (event) => {
    const target = event.target;
    const role = target.getAttribute("role");
    const section = target.closest("section");
    if (role === "checkbox") target.setAttribute("aria-checked", "true");
    if (role === "listbox") {
      target.setAttribute("aria-expanded", "true");
      target.querySelectorAll('[role="option"]').forEach((item) => { item.hidden = false; });
    }
    if (role === "option") {
      target.parentElement.dataset.selection = target.textContent;
      target.parentElement.setAttribute("aria-expanded", "false");
      target.parentElement.querySelectorAll('[role="option"]').forEach((item) => { item.hidden = true; });
    }
    if (role === "radio") {
      target.parentElement.querySelectorAll('[role="radio"]').forEach((item) => item.setAttribute("aria-checked", String(item === target)));
    }
    if (target.hasAttribute("data-next")) {
      const number = Number(section.dataset.section);
      const more = section.querySelector('[role="radio"][aria-checked="true"]')?.textContent === "Yes";
      const next = number < 4 && more ? number + 1 : "final";
      window.visits.push(next);
      section.hidden = true;
      document.querySelector('[data-section="' + next + '"]').hidden = false;
    }
    if (target.hasAttribute("data-submit")) window.submitCount += 1;
  });
</script>`;

function dailyStatusFixture() {
  const projectSections = statusData.projects.map((_, index) => {
    const number = index + 1;
    return `<section data-section="${number}" ${index ? "hidden" : ""}>
      ${index ? "" : email + question("Status of Day.", '<input type="date">')}
      ${question(`Project ${number} name`, select(statusData.projects.map((project) => project.name)))}
      ${question(`Tasks done (${number})`, "<textarea></textarea>")}
      ${duration(`Hours Spent (${number})`)}
      ${duration(`Hours Billed (${number})`)}
      ${duration(`Equivalent billable hours (${number})`)}
      ${question(`Reason if Hours Spent ≠ Hours Billed ≠ 8.5 (${number})`, "<textarea></textarea>")}
      ${number < 4 ? question("You have another project for status today?", radio()) : ""}
      <button data-next>Next</button>
    </section>`;
  }).join("");
  return `${projectSections}<section data-section="final" hidden>
    ${question("You learned something new today? What?", "<textarea></textarea>")}
    ${question("Is total of 'Hours Spent' 8.5 hrs?", radio())}
    ${question("If answer to above question is 'No', state reason.", select([...status.reasons, status.fullDayReason]))}
    ${question("Any other comments/Feedback", "<textarea></textarea>")}
    <button data-submit>Submit</button>
  </section>${controlScript}`;
}

function leaveFixture() {
  return `<section>${email}${leave.fields.map(({ label, type, options }) => question(
    label === "Leave date" ? "Leave date (Select either a single day or a start date for multiple days leave)" : label,
    options ? select(options) : type === "textarea" ? "<textarea></textarea>" : `<input type="${type}">`
  )).join("")}<button data-submit>Submit</button></section>${controlScript}`;
}

async function openFixture(url, body) {
  const page = await browser.newPage();
  page.setDefaultTimeout(2500);
  await page.route(url, (route) => route.fulfill({ contentType: "text/html", body }));
  return page;
}

test("Daily Status fills the four-project route and selects the 8:30 reason", async () => {
  const page = await openFixture(status.url, dailyStatusFixture());
  try {
    assert.equal((await fillDailyStatus(page, statusData)).submitted, false);
    assert.deepEqual(await page.evaluate(() => window.visits), [2, 3, 4, "final"]);
    assert.equal(await page.locator('input[type="date"]').inputValue(), statusData.date);
    const sections = page.locator("section");
    const fourth = sections.nth(3);
    assert.equal(await fourth.locator('[role="listbox"]').getAttribute("data-selection"), "Restro Automation");
    assert.equal(await fourth.locator("textarea").first().inputValue(), "Tested inventory.");
    const timeValues = await fourth.locator('input[aria-label="Hours"]').evaluateAll((inputs) => inputs.map((input) => input.value));
    assert.deepEqual(timeValues, ["04", "", "04"]);
    const final = sections.last();
    assert.equal(await final.getByRole("radio", { name: "Yes" }).getAttribute("aria-checked"), "true");
    assert.equal(await final.getByRole("listbox").getAttribute("data-selection"), status.fullDayReason);
    assert.equal(await page.evaluate(() => window.submitCount), 0);
  } finally { await page.close(); }
});

test("Daily Status skips later projects when a short day has one project", async () => {
  const page = await openFixture(status.url, dailyStatusFixture());
  try {
    const data = { ...statusData, projects: statusData.projects.slice(0, 1), totalReason: "Short Leave" };
    await fillDailyStatus(page, data);
    assert.deepEqual(await page.evaluate(() => window.visits), ["final"]);
    assert.equal(await page.getByRole("radio", { name: "No" }).getAttribute("aria-checked"), "true");
    assert.equal(await page.getByRole("listbox").getAttribute("data-selection"), "Short Leave");
  } finally { await page.close(); }
});

test("Leave Application fills the reviewed fields and leaves Submit for the user", async () => {
  const page = await openFixture(leave.url, leaveFixture());
  try {
    assert.equal((await fillLeaveApplication(page, { ...leaveData, autoSubmit: true })).submitted, false);
    const questions = page.locator('[role="listitem"]');
    for (const [index, { id, type }] of leave.fields.entries()) {
      const field = questions.nth(index);
      const value = type === "select"
        ? await field.getByRole("listbox").getAttribute("data-selection")
        : await field.locator("input, textarea").inputValue();
      assert.equal(value, leaveData[id]);
    }
    assert.equal(await page.getByRole("checkbox").getAttribute("aria-checked"), "true");
    assert.equal(await page.evaluate(() => window.submitCount), 0);
  } finally { await page.close(); }
});

test("one-date paid casual leave fills 1 day, None for coverage and No for completed work", async () => {
  assert.equal(getLeaveValidationError(paidCasualDraft), null);
  const page = await openFixture(leave.url, leaveFixture());
  try {
    await fillLeaveApplication(page, paidCasualDraft);
    assert.equal(await page.locator('input[type="number"]').inputValue(), "1");
    assert.equal(await page.locator('input[type="date"]').last().inputValue(), "");
    const coverage = page.getByRole("listitem").filter({ hasText: "Who will cover" });
    assert.equal(await coverage.locator("input").inputValue(), "None");
    assert.equal(await page.getByRole("listbox").last().getAttribute("data-selection"), "No");
    assert.equal(await page.evaluate(() => window.submitCount), 0);
  } finally { await page.close(); }
});

test("leave defaults do not replace explicit answers or compute a date range", () => {
  const overrides = { ...paidCasualDraft, days: "0.5", coverage: "Sample Colleague", workComplete: "Yes" };
  assert.deepEqual(withLeaveDefaults(overrides), overrides);
  const multipleDates = { ...paidCasualDraft, endDate: "2026-11-23" };
  assert.equal(withLeaveDefaults(multipleDates).days, "");
  assert.match(getLeaveValidationError(multipleDates), /How many days/);
  const sickLeave = withLeaveDefaults({ ...paidCasualDraft, leaveType: "Sick Leave" });
  assert.equal(sickLeave.days, "1");
  assert.equal(sickLeave.coverage, "");
  assert.equal(sickLeave.workComplete, "");
  assert.match(getLeaveValidationError(sickLeave), /Who will cover/);
});

test("guidance skips questions that are already answered by leave defaults", async (t) => {
  let question;
  t.mock.method(globalThis, "fetch", async (_url, { body }) => {
    const { instructions } = JSON.parse(body);
    assert.match(instructions, /defaults to one leave day/);
    assert.match(instructions, /defaults coverage to "None" and workComplete to "No"/);
    const text = JSON.stringify({
      message: question, isReady: false, needsClarification: true,
      clarificationQuestion: question, formData: paidCasualDraft
    });
    return Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text }] }] });
  });
  for (const missing of ["How many days of leave?", "Who will cover your responsibilities?", "Have you completed your work?"]) {
    question = missing;
    const response = await processUserMessage([{ role: "user", content: "Paid casual leave on November 20." }], "test-key", undefined, "openai", null, "leave");
    assert.equal(response.isReady, true);
    assert.equal(response.clarificationQuestion, null);
  }
});

test("leave requests correct the copied wedding reason in the applicant's voice", async (t) => {
  const copiedReason = "to attend his best friend marriage";
  const correctedReason = "I am requesting leave to attend my best friend's wedding.";
  t.mock.method(globalThis, "fetch", async (url, { body }) => {
    const request = JSON.parse(body);
    const openai = url === "https://api.openai.com/v1/responses";
    const instructions = openai ? request.instructions : request.systemInstruction.parts[0].text;
    assert.match(instructions, /from the applicant's point of view/);
    if (openai) {
      const fields = request.text.format.schema.properties.formData.anyOf[1].properties;
      assert.match(fields.reason.description, /first-person voice/);
    }
    const text = JSON.stringify({
      message: "Preview ready.", isReady: true, needsClarification: false, clarificationQuestion: null,
      formData: { ...paidCasualDraft, reason: copiedReason }
    });
    return openai
      ? Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text }] }] })
      : Response.json({ candidates: [{ content: { role: "model", parts: [{ text }] }, finishReason: "STOP" }] });
  });

  for (const provider of ["openai", "gemini"]) {
    const result = await processUserMessage([{ role: "user", content: `Apply for paid casual leave ${copiedReason}.` }], "test-key", undefined, provider, null, "leave");
    assert.equal(result.formData.reason, correctedReason);
  }

  const unchanged = { ...paidCasualDraft, reason: copiedReason };
  const dateOnly = await processUserMessage([{ role: "user", content: "Change only the start date." }], "test-key", undefined, "openai", unchanged, "leave");
  assert.equal(dateOnly.formData.reason, copiedReason);
  const verbatim = await processUserMessage([{ role: "user", content: `Use this exact reason: ${copiedReason}` }], "test-key", undefined, "openai", null, "leave");
  assert.equal(verbatim.formData.reason, copiedReason);
});

test("validation asks for missing reasons and a multi-day leave end date", () => {
  const shorterStatus = { ...statusData, projects: statusData.projects.slice(0, 1) };
  assert.match(getStatusValidationError(shorterStatus), /reason for the total hours/);
  shorterStatus.projects = [{ ...shorterStatus.projects[0], billed: "01:00" }];
  assert.match(getStatusValidationError(shorterStatus), /differ by more than 10 minutes/);
  assert.match(getLeaveValidationError({ ...leaveData, days: "2" }), /end date/);
  assert.equal(getLeaveValidationError(leaveData), null);
});

test("Gemini and ChatGPT receive the schema for the selected form", async (t) => {
  let expectedForm;
  t.mock.method(globalThis, "fetch", async (url, { body }) => {
    const request = JSON.parse(body);
    const openai = url === "https://api.openai.com/v1/responses";
    const instructions = openai ? request.instructions : request.systemInstruction.parts[0].text;
    assert.match(instructions, expectedForm === "status" ? /Prepare a Daily Status report/ : /Prepare a Leave Application/);
    if (openai) {
      assert.equal(request.text.format.name, expectedForm === "status" ? "daily_status" : "leave_application");
    }
    const message = JSON.stringify({
      message: "Review your draft.", isReady: true, needsClarification: false, clarificationQuestion: null,
      formData: expectedForm === "status" ? statusData : leaveData
    });
    return openai
      ? Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: message }] }] })
      : Response.json({ candidates: [{ content: { role: "model", parts: [{ text: message }] }, finishReason: "STOP" }] });
  });
  for (const formId of ["status", "leave"]) {
    expectedForm = formId;
    for (const provider of ["openai", "gemini"]) {
      const response = await processUserMessage([{ role: "user", content: "Fill the form using my answers." }], "test-key", undefined, provider, null, formId);
      assert.equal(response.isReady, true);
      assert.equal(formId === "status" ? response.formData.date : response.formData.leaveType, formId === "status" ? statusData.date : leaveData.leaveType);
    }
  }
});
