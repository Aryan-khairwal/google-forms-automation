const { chromium } = require("playwright");
const { localPath } = require("../config/localPaths");

const contexts = new Set();

async function createBrowserContext() {
  const profilePath = localPath("google-profile");

  // Uses Playwright's bundled Chromium.
  // viewport: null lets Chromium match the monitor's native window size and prevents canvas clipping.
  const context = await chromium.launchPersistentContext(profilePath, {
    headless: false,
    viewport: null,
    args: ["--start-maximized"]
  });

  contexts.add(context);
  context.on("close", () => contexts.delete(context));
  return context;
}

async function closeBrowserContexts() {
  await Promise.allSettled([...contexts].map((context) => context.close()));
}

function hasOpenBrowserContexts() {
  return contexts.size > 0;
}

module.exports = { createBrowserContext, closeBrowserContexts, hasOpenBrowserContexts };
