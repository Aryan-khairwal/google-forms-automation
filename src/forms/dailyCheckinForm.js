const { getQuestion } = require("../utils/getQuestion");
const { fillTime } = require("../utils/fillTime");
const { normalizeTaskText } = require("../utils/normalizeTaskText");
const { maxProjects } = require("../config/dayPlan.json");

const { ensureAriaChecked, selectOption, advanceToSection, confirmEmail, finishForm } = require("./googleFormControls");

const FIRST_SECTION_PROJECTS = 2;

function getProjectValidationError(projects) {
  if (!Array.isArray(projects) || !projects[0]) {
    return "At least Project 1 data is required.";
  }
  if (projects.length > maxProjects) {
    return `The form supports up to ${maxProjects} projects.`;
  }
  for (const [index, project] of projects.entries()) {
    if (!project || typeof project !== "object" || Array.isArray(project)) {
      return `Project ${index + 1} data is required.`;
    }
  }
  return null;
}

async function fillProject(page, project, projectNumber, onProgress) {
  const projectTitle = `Project ${projectNumber}`;
  const plannedTitle = `Hours Planned (${projectNumber})`;
  const billableTitle = `Billable hours (${projectNumber})`;
  const ebhTitle = `EBH (${projectNumber})`;
  const tasksTitle = `Tasks to be done (${projectNumber})`;

  if (onProgress) onProgress(`Selecting ${projectTitle}: ${project.name}`);
  await selectOption(page, projectTitle, project.name);

  if (onProgress) onProgress(`Filling ${plannedTitle}`);
  await fillTime(page, plannedTitle, project.planned);

  if (onProgress) onProgress(`Filling ${billableTitle}`);
  await fillTime(page, billableTitle, project.billable ?? project.planned, { allowBlank: true });

  const ebhQuestion = getQuestion(page, ebhTitle);
  const ebhCheckbox = ebhQuestion.getByRole("checkbox", {
    name: "Yes",
    exact: true
  });
  await ebhCheckbox.waitFor({ state: "visible" });
  const isChecked = (await ebhCheckbox.getAttribute("aria-checked")) === "true";

  if (project.ebhEquivalent && !isChecked) {
    if (onProgress) onProgress(`Checking ${ebhTitle} (EB Equivalent)`);
    await ensureAriaChecked(ebhCheckbox, "true");
  } else if (!project.ebhEquivalent && isChecked) {
    if (onProgress) onProgress(`Unchecking ${ebhTitle} (EB is false by default)`);
    await ensureAriaChecked(ebhCheckbox, "false");
  }

  if (onProgress) onProgress(`Filling ${tasksTitle}`);
  const tasksQuestion = getQuestion(page, tasksTitle);
  await tasksQuestion.locator("textarea").fill(normalizeTaskText(project.tasks));
}

async function answerAnotherProject(page, section, answer, onProgress) {
  onProgress(`Answering "You have another project for today?" on ${section}: ${answer}`);
  const question = getQuestion(page, "You have another project for today?");
  const radio = question.getByRole("radio", { name: answer, exact: true });

  try {
    await ensureAriaChecked(radio);
  } catch (error) {
    throw new Error(`Could not select "${answer}" for the additional project question on ${section}.`, { cause: error });
  }
}

async function fillDailyCheckin(page, data, onProgress = () => {}) {
  const { projects } = data;
  const validationError = getProjectValidationError(projects);
  if (validationError) throw new Error(validationError);

  onProgress("Navigating to form URL...");
  await page.goto(data.formUrl, { waitUntil: "domcontentloaded" });

  onProgress("Waiting for form questions...");
  await getQuestion(page, "Today I will work (hrs)").waitFor({
    state: "visible"
  });

  await confirmEmail(page, onProgress);

  onProgress("Filling total working hours...");
  await fillTime(page, "Today I will work (hrs)", data.totalWork || "08:30");

  let currentSection = "Projects 1–2";
  for (const [index, project] of projects.entries()) {
    const projectNumber = index + 1;
    if (projectNumber > FIRST_SECTION_PROJECTS) {
      const nextSection = `Project ${projectNumber}`;
      await answerAnotherProject(page, currentSection, "Yes", onProgress);
      await advanceToSection(
        page, currentSection, nextSection, getQuestion(page, `Hours Planned (${projectNumber})`), onProgress
      );
      currentSection = nextSection;
    }
    await fillProject(page, project, projectNumber, onProgress);
  }

  if (projects.length < maxProjects) {
    await answerAnotherProject(page, currentSection, "No", onProgress);
  }
  const blockerQuestion = getQuestion(page, "Any blocker?");
  await advanceToSection(page, currentSection, "Final", blockerQuestion, onProgress);
  onProgress("Filling 'Any blocker?'...");
  await blockerQuestion.locator("textarea, input[type='text']").fill(data.blocker || "None");

  return finishForm(page, data.autoSubmit, onProgress);
}

module.exports = { fillDailyCheckin, getProjectValidationError };
