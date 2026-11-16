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

async function fillProject(page, project, projectNumber) {
  const projectTitle = `Project ${projectNumber}`;
  const plannedTitle = `Hours Planned (${projectNumber})`;
  const billableTitle = `Billable hours (${projectNumber})`;
  const ebhTitle = `EBH (${projectNumber})`;
  const tasksTitle = `Tasks to be done (${projectNumber})`;

  await selectProject(page, projectTitle, project.name);
  await fillTime(page, plannedTitle, project.planned);
  await fillTime(page, billableTitle, project.billable);

  if (project.ebhEquivalent) {
    const ebhQuestion = getQuestion(page, ebhTitle);
    await ensureAriaChecked(
      ebhQuestion.getByRole("checkbox", {
        name: "Yes",
        exact: true
      })
    );
  }

  const tasksQuestion = getQuestion(page, tasksTitle);
  await tasksQuestion.locator("textarea").fill(project.tasks);
}

async function fillDailyCheckin(page, data) {
  await page.goto(data.formUrl, { waitUntil: "domcontentloaded" });

  // Wait until the form questions are rendered.
  await getQuestion(page, "Today I will work (hrs)").waitFor({
    state: "visible"
  });

  // Google Forms records the signed-in account when this checkbox is selected.
  // The form does not expose a separate editable email textbox in its HTML.
  await ensureAriaChecked(
    page.getByRole("checkbox", {
      name: `Record ${data.email} as the email to be included with my response`,
      exact: true
    })
  );

  await fillTime(page, "Today I will work (hrs)", data.totalWork);

  if (!data.projects[0]) {
    throw new Error("Project 1 data is required.");
  }

  await fillProject(page, data.projects[0], 1);

  if (data.projects[1]) {
    await fillProject(page, data.projects[1], 2);
  }

  const anotherProjectQuestion = getQuestion(
    page,
    "You have another project for today?"
  );

  await ensureAriaChecked(
    anotherProjectQuestion.getByRole("radio", {
      name: data.anotherProject,
      exact: true
    })
  );

  console.log("Form fields have been filled. Review them in the browser.");
}

module.exports = { fillDailyCheckin };
