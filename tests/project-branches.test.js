const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { fillDailyCheckin } = require("../src/forms/dailyCheckinForm");

const formUrl = "https://form.test/";
const projectNames = ["CultBooking.com", "Restro Automation", "File AI", "Others Tasks"];
const groupedTaskLines = ["Giga project:-", "Review site changes.", "Vaidhakim:-", "Check the chatbot."];
let browser;

before(async () => {
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
});

function timeQuestion(title, field, initialValue = "") {
  return `<div role="listitem" data-field="${field}"><h2>${title}</h2>
    ${["Hours", "Minutes", "Seconds"].map(label => `<input aria-label="${label}" value="${initialValue}">`).join("")}
  </div>`;
}

function projectQuestions(number) {
  const billableTitle = number === 4 ? "Billable Hours (4)" : `Billable hours (${number})`;
  const options = projectNames.map(name => `<button type="button" role="option" hidden>${name}</button>`).join("");
  return `<article data-project="${number}">
    <div role="listitem"><h2>Project ${number}</h2><div role="listbox" aria-expanded="false" tabindex="0" style="min-height: 20px">${options}</div></div>
    ${timeQuestion(`Hours Planned (${number})`, "planned")}
    ${timeQuestion(billableTitle, "billable", "12")}
    <div role="listitem"><h2>EBH (${number})</h2><button type="button" role="checkbox" aria-checked="false">Yes</button></div>
    <div role="listitem"><h2>Tasks to be done (${number})</h2><textarea></textarea></div>
  </article>`;
}

const anotherProjectQuestion = `<div role="listitem">
  <h2>You have another project for today?</h2>
  <button type="button" role="radio" aria-checked="false">Yes</button>
  <button type="button" role="radio" aria-checked="false">No</button>
</div>`;

function formFixture({ showConfirmation = true, skipProjectThree = false } = {}) {
  return `<section data-section="start">
    <button type="button" role="checkbox" aria-checked="false">Record tester@example.com as the email to be included with my response</button>
    ${timeQuestion("Today I will work (hrs)", "total")}
    ${projectQuestions(1)}
    ${projectQuestions(2)}
    ${anotherProjectQuestion}
    <button data-next>Next</button>
  </section>
  <section data-section="project-3" hidden>
    <div role="listitem"><h2>Project 3</h2><p>If applicable</p></div>
    ${projectQuestions(3)}
    ${anotherProjectQuestion}
    <button data-next>Next</button>
  </section>
  <section data-section="project-4" hidden>
    <div role="listitem"><h2>Project 4</h2><p>If applicable</p></div>
    ${projectQuestions(4)}
    <button data-next>Next</button>
  </section>
  <section data-section="final" hidden>
    <h2>Final</h2>
    <div role="listitem"><h2>Any blocker?</h2><textarea></textarea></div>
    <button data-submit>Submit</button>
  </section>
  <section data-section="confirmation" hidden><h2>Your response has been recorded.</h2></section>
  <script>
    window.formProgress = { sections: ["start"], answers: [], submitClicks: 0 };
    function changeSection(currentSection, nextSection) {
      currentSection.hidden = true;
      document.querySelector('[data-section="' + nextSection + '"]').hidden = false;
      window.formProgress.sections.push(nextSection);
    }
    document.addEventListener("click", event => {
      const target = event.target;
      const role = target.getAttribute("role");

      if (role === "listbox") {
        target.setAttribute("aria-expanded", "true");
        target.querySelectorAll('[role="option"]').forEach(option => { option.hidden = false; });
      } else if (role === "option") {
        const listbox = target.parentElement;
        listbox.dataset.selected = target.textContent;
        listbox.setAttribute("aria-expanded", "false");
        listbox.querySelectorAll('[role="option"]').forEach(option => { option.hidden = true; });
      } else if (role === "radio") {
        target.parentElement.querySelectorAll('[role="radio"]').forEach(radio => {
          radio.setAttribute("aria-checked", String(radio === target));
        });
      } else if (role === "checkbox") {
        target.setAttribute("aria-checked", String(target.getAttribute("aria-checked") === "false"));
      } else if (target.hasAttribute("data-next")) {
        const section = target.closest("section");
        const id = section.dataset.section;
        const answer = section.querySelector('[role="radio"][aria-checked="true"]')?.textContent;
        if (id === "project-4") return changeSection(section, "final");
        if (!answer) return;
        window.formProgress.answers.push(answer);
        if (answer === "No") return changeSection(section, "final");
        changeSection(section, id === "start" ? ${skipProjectThree ? '"final"' : '"project-3"'} : "project-4");
      } else if (target.hasAttribute("data-submit")) {
        window.formProgress.submitClicks += 1;
        if (${showConfirmation}) changeSection(target.closest("section"), "confirmation");
      }
    });
  </script>`;
}

function makePlan(count, autoSubmit = false) {
  return {
    formUrl,
    totalWork: "08:00",
    blocker: "Waiting for review",
    // The count must decide the route even for data with this older field.
    anotherProject: count > 2 ? "No" : "Yes",
    autoSubmit,
    projects: projectNames.slice(0, count).map((name, index) => ({
      name,
      planned: "02:00",
      billable: ["02:00", "00:00", "", "01:30"][index],
      ebhEquivalent: index === 2,
      tasks: index === 3
        ? groupedTaskLines.join("\\n")
        : `Work on project ${index + 1} tasks.`
    }))
  };
}

async function openFixture(options) {
  const page = await browser.newPage();
  page.setDefaultTimeout(2000);
  await page.route(formUrl, route => route.fulfill({
    contentType: "text/html",
    body: formFixture(options)
  }));
  return page;
}

const scenarios = [
  { count: 1, answers: ["No"], sections: ["start", "final"] },
  { count: 2, answers: ["No"], sections: ["start", "final"] },
  { count: 3, answers: ["Yes", "No"], sections: ["start", "project-3", "final"] },
  { count: 4, answers: ["Yes", "Yes"], sections: ["start", "project-3", "project-4", "final"] }
];

for (const { count, answers, sections } of scenarios) {
  test(`fills ${count} project(s) and reaches Final for manual review`, async () => {
    const page = await openFixture();
    try {
      const plan = makePlan(count);
      const result = await fillDailyCheckin(page, plan);
      assert.deepEqual(result, { success: true, submitted: false });
      assert.deepEqual(await page.evaluate(() => window.formProgress), { sections, answers, submitClicks: 0 });
      assert.equal(await page.locator('[data-section="final"] textarea').inputValue(), plan.blocker);
      assert.equal(await page.getByRole("button", { name: "Submit", exact: true }).isVisible(), true);

      for (const [index, project] of plan.projects.entries()) {
        const filled = page.locator(`[data-project="${index + 1}"]`);
        assert.equal(await filled.locator('[role="listbox"]').getAttribute("data-selected"), project.name);
        const expectedTasks = index === 3 ? groupedTaskLines.join("\n") : project.tasks;
        assert.equal(await filled.locator("textarea").inputValue(), expectedTasks);
        assert.equal(await filled.locator('[role="checkbox"]').getAttribute("aria-checked"), String(project.ebhEquivalent));
        assert.deepEqual(await filled.locator('[data-field="planned"] input').evaluateAll(inputs => inputs.map(input => input.value)), ["02", "00", "00"]);
        const expectedBillable = project.billable ? [...project.billable.split(":"), "00"] : ["", "", ""];
        assert.deepEqual(await filled.locator('[data-field="billable"] input').evaluateAll(inputs => inputs.map(input => input.value)), expectedBillable);
      }
    } finally {
      await page.close();
    }
  });
}

test("auto-submits four projects and waits for the confirmation screen", async () => {
  const page = await openFixture();
  try {
    const result = await fillDailyCheckin(page, makePlan(4, true));
    assert.deepEqual(result, { success: true, submitted: true });
    assert.deepEqual(await page.evaluate(() => window.formProgress), {
      sections: ["start", "project-3", "project-4", "final", "confirmation"],
      answers: ["Yes", "Yes"],
      submitClicks: 1
    });
  } finally {
    await page.close();
  }
});

test("reports an unexpected branch and leaves the form unsubmitted", async () => {
  const page = await openFixture({ skipProjectThree: true });
  try {
    await assert.rejects(fillDailyCheckin(page, makePlan(3, true)), /Could not reach Project 3 from Projects 1–2/);
    assert.equal(await page.evaluate(() => window.formProgress.submitClicks), 0);
  } finally {
    await page.close();
  }
});

test("does not report submission when the confirmation is missing", async () => {
  const page = await openFixture({ showConfirmation: false });
  try {
    await assert.rejects(fillDailyCheckin(page, makePlan(1, true)), /Could not confirm submission/);
    assert.equal(await page.evaluate(() => window.formProgress.submitClicks), 1);
  } finally {
    await page.close();
  }
});

test("rejects more than four projects before visiting the form", async () => {
  const plan = makePlan(4);
  plan.projects.push(plan.projects[0]);
  await assert.rejects(fillDailyCheckin(null, plan), /supports up to 4 projects/);
});
