const { test } = require("node:test");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { fillDailyCheckin } = require("../src/forms/dailyCheckinForm");

test("records the signed-in user's email even when supplied data names another account", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(1500);
    await page.route("https://form.test/", route => route.fulfill({
      contentType: "text/html",
      body: `<label><input type="checkbox" aria-checked="false" onclick="this.setAttribute('aria-checked', this.checked)">Record tester@example.com as the email to be included with my response</label>
        <div role="listitem"><h2>Today I will work (hrs)</h2>
        <input aria-label="Hours"><input aria-label="Minutes"><input aria-label="Seconds"></div>`
    }));
    // Stop after email and total hours, before the project-filling stage.
    await assert.rejects(fillDailyCheckin(page, {
      formUrl: "https://form.test/", email: "original-author@example.com", autoSubmit: false
    }), /At least Project 1 data is required/);
    assert.equal(await page.getByRole("checkbox").isChecked(), true);
  } finally {
    await browser.close();
  }
});
