const { getQuestion } = require("../utils/getQuestion");
const { fillTime } = require("../utils/fillTime");

async function ensureAriaChecked(locator, desiredState = "true") {
  await locator.waitFor({ state: "visible" });

  const currentState = await locator.getAttribute("aria-checked");

  if (currentState === desiredState) {
    return;
  }

  await locator.click();

  // Wait until Google Forms updates the checkbox/radio state.
  const start = Date.now();
  while (Date.now() - start < 5000) {
    if ((await locator.getAttribute("aria-checked")) === desiredState) {
      return;
    }
    await locator.page().waitForTimeout(100);
  }
}

async function selectProject(page, questionTitle, projectName) {
  const question = getQuestion(page, questionTitle);
  const listbox = question.getByRole("listbox");

  await question.scrollIntoViewIfNeeded();

  // If the listbox is not open, click to open it
  const isExpanded = await listbox.getAttribute("aria-expanded");
  if (isExpanded !== "true") {
    await listbox.click();
  }

  // Google Forms uses custom listboxes. We scope getByRole("option")
  // to this specific question to avoid strict mode violations
  // when multiple project dropdowns exist on the form.
  const option = question.getByRole("option", {
    name: projectName,
    exact: true
  });
  await option.waitFor({ state: "visible" });
  await option.click();

  // Brief pause to allow Google Forms to register the click and update
  await page.waitForTimeout(300);

  // If the dropdown remains open (for instance, when the selected option
  // was already pre-selected by Google Forms autosave), dismiss it with Escape
  // so it does not stay open and overlay/block the subsequent inputs.
  if ((await listbox.getAttribute("aria-expanded")) === "true") {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
  }
}

async function fillProject(page, project, projectNumber, onProgress) {
  const projectTitle = `Project ${projectNumber}`;
  const plannedTitle = `Hours Planned (${projectNumber})`;
  const billableTitle = `Billable hours (${projectNumber})`;
  const ebhTitle = `EBH (${projectNumber})`;
  const tasksTitle = `Tasks to be done (${projectNumber})`;

  if (onProgress) onProgress(`Selecting ${projectTitle}: ${project.name}`);
  await selectProject(page, projectTitle, project.name);

  if (onProgress) onProgress(`Filling ${plannedTitle}`);
  await fillTime(page, plannedTitle, project.planned);

  if (onProgress) onProgress(`Filling ${billableTitle}`);
  await fillTime(page, billableTitle, project.billable);

  if (project.ebhEquivalent) {
    if (onProgress) onProgress(`Checking ${ebhTitle}`);
    const ebhQuestion = getQuestion(page, ebhTitle);
    await ensureAriaChecked(
      ebhQuestion.getByRole("checkbox", {
        name: "Yes",
        exact: true
      })
    );
  }

  if (onProgress) onProgress(`Filling ${tasksTitle}`);
  const tasksQuestion = getQuestion(page, tasksTitle);
  await tasksQuestion.locator("textarea").fill(project.tasks || "");
}

async function fillDailyCheckin(page, data, onProgress = () => {}) {
  onProgress("Navigating to form URL...");
  await page.goto(data.formUrl, { waitUntil: "domcontentloaded" });

  onProgress("Waiting for form questions...");
  await getQuestion(page, "Today I will work (hrs)").waitFor({
    state: "visible"
  });

  onProgress("Confirming email inclusion...");
  await ensureAriaChecked(
    page.getByRole("checkbox", {
      name: `Record ${data.email} as the email to be included with my response`,
      exact: true
    })
  );

  onProgress("Filling total working hours...");
  await fillTime(page, "Today I will work (hrs)", data.totalWork || "08:30");

  if (!data.projects || !data.projects[0]) {
    throw new Error("At least Project 1 data is required.");
  }

  await fillProject(page, data.projects[0], 1, onProgress);

  if (data.projects[1]) {
    await fillProject(page, data.projects[1], 2, onProgress);
  }

  onProgress("Setting 'another project' answer...");
  const anotherProjectQuestion = getQuestion(
    page,
    "You have another project for today?"
  );

  await ensureAriaChecked(
    anotherProjectQuestion.getByRole("radio", {
      name: data.anotherProject || "No",
      exact: true
    })
  );

  onProgress("Moving to Page 2 (Final)...");
  const nextBtn = page.getByRole("button", { name: "Next", exact: true });
  await nextBtn.scrollIntoViewIfNeeded();
  await nextBtn.click();

  // Wait for Section 2 ("Final")
  await page.getByRole("heading", { name: /^Final/ }).waitFor({ state: "visible" });

  onProgress("Filling 'Any blocker?'...");
  const blockerQuestion = getQuestion(page, "Any blocker?");
  await blockerQuestion.scrollIntoViewIfNeeded();
  await blockerQuestion.locator("textarea, input[type='text']").fill(data.blocker || "None");

  if (data.autoSubmit) {
    onProgress("Submitting the form...");
    const submitBtn = page.getByRole("button", { name: "Submit", exact: true });
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();
    onProgress("Form successfully submitted!");
  } else {
    onProgress("Form fields filled up to Final page. Ready for review/submit.");
  }

  return { success: true };
}

module.exports = { fillDailyCheckin };
