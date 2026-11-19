const path = require("node:path");
const fs = require("node:fs");
const express = require("express");
const { localPath } = require("./config/localPaths");

require("dotenv").config({ path: localPath(".env") });

const { createBrowserContext } = require("./browser/createBrowser");
const { getTodayCheckin, recordCheckinSubmission, watchCheckinSubmission } = require("./forms/checkinSubmission");
const { fillDailyCheckin } = require("./forms/dailyCheckinForm");
const { fillDailyStatus } = require("./forms/dailyStatusForm");
const { fillLeaveApplication } = require("./forms/leaveApplicationForm");
const { getCheckinQuestion, getStatusValidationError, getLeaveValidationError } = require("./forms/formValidation");
const { processUserMessage, testProviderApiKey, AVAILABLE_PROJECTS, DEFAULT_CONFIG } = require("./agent/formAgent");
const { PROVIDERS, getActiveProvider, getApiKey, getModel, getPublicSettings } = require("./config/aiProviders");

const app = express();
const MODEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/;
const API_KEY_PATTERN = /^[A-Za-z0-9_-]+$/;
const formHandlers = {
  checkin: { fill: fillDailyCheckin, validate: getCheckinQuestion },
  status: { fill: fillDailyStatus, validate: getStatusValidationError },
  leave: { fill: fillLeaveApplication, validate: getLeaveValidationError }
};

app.use((req, res, next) => {
  if (req.hostname !== "localhost" && req.hostname !== "127.0.0.1") {
    return res.status(403).json({ error: "Use the local app address to access this server." });
  }
  if (app.locals.desktopToken && req.get("x-forms-desktop-token") !== app.locals.desktopToken) {
    return res.sendStatus(403);
  }
  next();
});
app.use(express.json());

// Serve static frontend assets (auto-build if missing)
const distPath = path.resolve(__dirname, "../dist");
if (!fs.existsSync(distPath) && require.main === module) {
  console.log("dist/ folder not found. Building frontend assets...");
  try {
    require("node:child_process").execSync("npx vite build", { stdio: "inherit" });
  } catch (err) {
    console.error("Failed to auto-build frontend:", err.message);
  }
}
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// 1. Get default configuration & available projects
app.get("/api/config", (req, res) => {
  const settings = getPublicSettings();
  res.json({
    defaultConfig: DEFAULT_CONFIG,
    availableProjects: AVAILABLE_PROJECTS,
    ...settings,
    hasApiKey: settings.providers[settings.provider].hasApiKey,
    model: settings.providers[settings.provider].model
  });
});

app.get("/api/checkin/today", (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    res.json(getTodayCheckin());
  } catch {
    res.status(500).json({ error: "Could not read today's Daily Check-in submission." });
  }
});

// 2. Generate a day plan with the selected provider
app.post("/api/chat", async (req, res) => {
  const { messages, apiKey, model, provider = getActiveProvider(), currentPlan, formId = "checkin" } = req.body || {};
  if (typeof formId !== "string" || !Object.hasOwn(formHandlers, formId)) {
    return res.status(400).json({ error: "Choose a supported form." });
  }
  if (!Array.isArray(messages) || messages.length === 0 || messages.some((message) => (
    !message || typeof message !== "object" || message.content == null
  ))) {
    return res.status(400).json({ error: "A messages array with message content is required." });
  }
  if (typeof provider !== "string" || !Object.hasOwn(PROVIDERS, provider)) {
    return res.status(400).json({ error: "Choose Gemini or ChatGPT." });
  }
  if (apiKey && (typeof apiKey !== "string" || !API_KEY_PATTERN.test(apiKey))) {
    return res.status(400).json({ error: "Enter a valid API key without spaces." });
  }
  if (model && (typeof model !== "string" || !MODEL_PATTERN.test(model))) {
    return res.status(400).json({ error: "Enter a valid model name." });
  }
  const { label } = PROVIDERS[provider];
  if (!apiKey && !getApiKey(provider)) {
    return res.status(400).json({ error: `Enter a ${label} API key in Settings.` });
  }

  try {
    const result = await processUserMessage(messages, apiKey, model, provider, currentPlan, formId);
    res.json(result);
  } catch (error) {
    const status = Number(error.status);
    console.error(`${label} request failed${Number.isInteger(status) ? ` (HTTP ${status})` : ""}.`);
    const guidance = {
      400: "Check that the selected model supports structured responses.",
      401: "Check your API key in Settings.",
      403: "Check that your API key has access to the selected model.",
      404: "Check the model name and access in Settings.",
      429: "Check your API quota and billing, or try again later."
    };
    res.status(502).json({ error: `${label} could not prepare the form. ${guidance[status] || "Try again in a moment."}` });
  }
});

function validateProviderSettings(provider, apiKey, model) {
  if (typeof provider !== "string" || !Object.hasOwn(PROVIDERS, provider)) {
    return "Choose Gemini or ChatGPT.";
  }
  if (typeof apiKey !== "string" || (apiKey && !API_KEY_PATTERN.test(apiKey))) {
    return "Enter a valid API key without spaces.";
  }
  if (model !== undefined && (typeof model !== "string" || !MODEL_PATTERN.test(model))) {
    return "Enter a valid model name.";
  }
  if (!apiKey && !getApiKey(provider)) {
    return `Enter a ${PROVIDERS[provider].label} API key.`;
  }
}

app.post("/api/test-key", async (req, res) => {
  const { apiKey = "", model, provider = getActiveProvider() } = req.body || {};
  const validationError = validateProviderSettings(provider, apiKey, model);
  if (validationError) return res.status(400).json({ error: validationError });

  const { label } = PROVIDERS[provider];
  const modelName = model ?? getModel(provider);
  try {
    await testProviderApiKey(provider, apiKey || getApiKey(provider), modelName);
    res.json({ message: `API key accepted by ${label} for ${modelName}. You can now save your settings.` });
  } catch (error) {
    if (error.name === "TimeoutError") {
      return res.status(504).json({ error: `${label} did not respond in time. Try again.` });
    }

    const guidance = {
      400: "Check your API key and model name.",
      401: "Check that the API key is correct and active.",
      403: "Check the API key permissions and project access.",
      404: "Check the model name and whether your API key can use it.",
      429: "Check your API quota and billing, or try again later."
    };
    res.status(502).json({ error: `${label} API key test failed. ${guidance[error.status] || "Try again in a moment."}` });
  }
});

// 3. Save the active provider and its settings
app.post("/api/save-key", (req, res) => {
  const { apiKey = "", model, provider = "gemini" } = req.body || {};
  const validationError = validateProviderSettings(provider, apiKey, model);
  if (validationError) return res.status(400).json({ error: validationError });

  const { keyEnv, modelEnv } = PROVIDERS[provider];
  const updates = { AI_PROVIDER: provider };
  if (apiKey) updates[keyEnv] = apiKey;
  if (model) updates[modelEnv] = model;

  try {
    saveProviderSettings(updates);
    Object.assign(process.env, updates);
    res.json({ success: true, ...getPublicSettings() });
  } catch {
    res.status(500).json({ error: "Could not save settings to the local .env file." });
  }
});

function saveProviderSettings(updates) {
  const envPath = localPath(".env");
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

  for (const [name, value] of Object.entries(updates)) {
    const entry = `${name}=${value}`;
    const line = new RegExp(`^[ \\t]*(?:export[ \\t]+)?${name}[ \\t]*=[^\\r\\n]*`, "gm");
    if (line.test(content)) {
      content = content.replace(line, () => entry);
    } else {
      const separator = content && !content.endsWith("\n") ? "\n" : "";
      content += `${separator}${entry}\n`;
    }
  }

  const stagingDir = fs.mkdtempSync(localPath(".env-save-"));
  try {
    const stagingFile = path.join(stagingDir, ".env");
    fs.writeFileSync(stagingFile, content, { mode: 0o600 });
    fs.renameSync(stagingFile, envPath);
  } finally {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
}

// 4. Trigger Playwright Form Automation
let isAutomationRunning = false;
let latestLogs = [];

app.post("/api/fill-form", async (req, res) => {
  if (isAutomationRunning) {
    return res.status(409).json({ error: "Automation is already in progress." });
  }

  const { formData, autoSubmit, formId = "checkin" } = req.body || {};
  if (!formData || typeof formData !== "object" || Array.isArray(formData)) {
    return res.status(400).json({ error: "formData is required." });
  }
  if (typeof formId !== "string" || !Object.hasOwn(formHandlers, formId)) {
    return res.status(400).json({ error: "Choose a supported form." });
  }
  const handler = formHandlers[formId];
  const validationError = handler.validate(formData);
  if (validationError) return res.status(400).json({ error: validationError });

  isAutomationRunning = true;
  latestLogs = [];

  const addLog = (msg) => {
    const logItem = `[${new Date().toLocaleTimeString()}] ${msg}`;
    console.log(logItem);
    latestLogs.push(logItem);
  };

  addLog("Starting Playwright automation...");

  let context;
  let submitted = false;
  try {
    context = await createBrowserContext();
    const page = context.pages()[0] || (await context.newPage());

    const dataToFill = {
      ...DEFAULT_CONFIG,
      ...formData,
      formUrl: DEFAULT_CONFIG.formUrl,
      autoSubmit: formId !== "leave" && autoSubmit === true
    };

    const result = await handler.fill(page, dataToFill, addLog);
    submitted = result.submitted;
    if (formId === "checkin") {
      if (submitted) recordCheckinSubmission(dataToFill.projects);
      else await watchCheckinSubmission(page, dataToFill);
    }

    addLog("Form fill process completed!");

    res.json({
      success: true,
      message: submitted
        ? "Form filled and submitted successfully."
        : "Form filled. Review it in the open browser.",
      logs: latestLogs
    });
  } catch (err) {
    addLog(`Error: ${err.message}`);
    console.error("Automation error:", formId === "leave" ? err.message : err);
    res.status(500).json({ error: err.message, logs: latestLogs });
  } finally {
    // Leave the form open for manual review or if automation needs attention.
    if (context && submitted) {
      await context.close().catch(() => {});
    }
    isAutomationRunning = false;
  }
});

app.get("/api/logs", (req, res) => {
  res.json({ isRunning: isAutomationRunning, logs: latestLogs });
});

// Fallback to index.html for SPA routing
if (fs.existsSync(distPath)) {
  app.use((req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

function startServer({ port = Number(process.env.PORT || 3001), desktopToken } = {}) {
  app.locals.desktopToken = desktopToken;
  return new Promise((resolve, reject) => {
    const server = app.listen(port, "127.0.0.1", (error) => {
      if (error) return reject(error);
      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer().then((server) => {
    console.log(`Backend server running on http://127.0.0.1:${server.address().port}`);
  }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { startServer, isFormAutomationRunning: () => isAutomationRunning };
