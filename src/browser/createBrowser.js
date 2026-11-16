const path = require("node:path");
const { chromium } = require("playwright");

async function createBrowserContext() {
  const profilePath = path.resolve(process.cwd(), "google-profile");

  // Uses Playwright's bundled Chromium.
  // The persistent profile keeps your Google sign-in between runs.
  const context = await chromium.launchPersistentContext(profilePath, {
    headless: false,
    viewport: { width: 1440, height: 1000 }
  });

  return context;
}

module.exports = { createBrowserContext };
