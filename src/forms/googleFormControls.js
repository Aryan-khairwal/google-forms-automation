const { getQuestion } = require("../utils/getQuestion");

const NAVIGATION_TIMEOUT = 10_000;

async function ensureAriaChecked(locator, desiredState = "true") {
  await locator.waitFor({ state: "visible" });

  const currentState = await locator.getAttribute("aria-checked");

  if (currentState === desiredState) {
    return;
  }

  await locator.click();
  await locator.and(locator.page().locator(`[aria-checked="${desiredState}"]`))
    .waitFor({ state: "visible", timeout: 5_000 });
}

async function selectOption(page, questionTitle, optionLabel) {
  const question = getQuestion(page, questionTitle, { control: page.getByRole("listbox") });
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
    name: optionLabel,
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

async function advanceToSection(page, currentSection, nextSection, nextQuestion, onProgress) {
  onProgress(`Moving from ${currentSection} to ${nextSection}...`);
  try {
    await page.getByRole("button", { name: "Next", exact: true }).click({ timeout: NAVIGATION_TIMEOUT });
    await nextQuestion.waitFor({ state: "visible", timeout: NAVIGATION_TIMEOUT });
  } catch (error) {
    throw new Error(`Could not reach ${nextSection} from ${currentSection}. Check the open form for missing answers or a changed route.`, { cause: error });
  }
}

async function confirmEmail(page, onProgress) {
  onProgress("Confirming email inclusion...");
  await ensureAriaChecked(
    page.getByRole("checkbox", {
      name: /^Record\s+\S+@\S+\s+as the email to be included with my response$/
    })
  );
}

function getSubmissionConfirmation(page) {
  return page.getByText(/^(?:Your response has been recorded\.?|Thanks for filling out (?:the|this) form\b.*|Submit another response)$/i).first();
}

async function finishForm(page, autoSubmit, onProgress) {
  if (autoSubmit) {
    onProgress("Submitting the form...");
    try {
      await page.getByRole("button", { name: "Submit", exact: true }).click({ timeout: NAVIGATION_TIMEOUT });
      await getSubmissionConfirmation(page).waitFor({ state: "visible", timeout: NAVIGATION_TIMEOUT });
    } catch (error) {
      throw new Error("Could not confirm submission. Check the open form before retrying.", { cause: error });
    }
    onProgress("Form successfully submitted!");
    return { success: true, submitted: true };
  }
  onProgress("Form fields filled up to Final page. Ready for review/submit.");
  return { success: true, submitted: false };
}

module.exports = { ensureAriaChecked, selectOption, advanceToSection, confirmEmail, finishForm, getSubmissionConfirmation };
