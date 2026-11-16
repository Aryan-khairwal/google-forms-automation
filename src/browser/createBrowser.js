const path = require("node:path");
const { chromium } = require("playwright");

async function createBrowserContext() {
  const profilePath = path.resolve(process.cwd(), "google-profile");

  // Uses Playwright's bundled Chromium.
  // viewport: null lets Chromium match the monitor's native window size and prevents canvas clipping.
  const context = await chromium.launchPersistentContext(profilePath, {
    headless: false,
    viewport: null,
    args: ["--start-maximized"]
  });

  return context;
}

module.exports = { createBrowserContext };
