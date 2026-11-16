require("dotenv").config();
const path = require("node:path");
const fs = require("node:fs");
const express = require("express");
const cors = require("cors");

const { createBrowserContext } = require("./browser/createBrowser");
const { fillDailyCheckin } = require("./forms/dailyCheckinForm");
const { processUserMessage, AVAILABLE_PROJECTS, DEFAULT_CONFIG } = require("./agent/formAgent");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static frontend assets if built
const distPath = path.resolve(__dirname, "../dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// 1. Get default configuration & available projects
app.get("/api/config", (req, res) => {
  res.json({
    defaultConfig: DEFAULT_CONFIG,
    availableProjects: AVAILABLE_PROJECTS,
    hasApiKey: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
    model: process.env.GEMINI_MODEL || "gemini-3.8-flash"
  });
});

// 2. Chat with LangChain Gemini Agent
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, apiKey, model } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required." });
    }

    const modelName = model || process.env.GEMINI_MODEL || "gemini-3.8-flash";
    const result = await processUserMessage(messages, apiKey, modelName);
    res.json(result);
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Save API Key to .env
app.post("/api/save-key", (req, res) => {
  try {
    const { apiKey, model } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "apiKey is required." });
    }

    process.env.GEMINI_API_KEY = apiKey;
    if (model) process.env.GEMINI_MODEL = model;

    const envPath = path.resolve(process.cwd(), ".env");
    let content = "";
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, "utf8");
    }

    if (content.includes("GEMINI_API_KEY=")) {
      content = content.replace(/GEMINI_API_KEY=.*/g, `GEMINI_API_KEY=${apiKey}`);
    } else {
      content += `\nGEMINI_API_KEY=${apiKey}`;
    }

    if (model) {
      if (content.includes("GEMINI_MODEL=")) {
        content = content.replace(/GEMINI_MODEL=.*/g, `GEMINI_MODEL=${model}`);
      } else {
        content += `\nGEMINI_MODEL=${model}`;
      }
    }

    fs.writeFileSync(envPath, content.trim() + "\n", "utf8");
    res.json({ success: true, message: "API key saved to .env" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Trigger Playwright Form Automation
let isAutomationRunning = false;
let latestLogs = [];

app.post("/api/fill-form", async (req, res) => {
  if (isAutomationRunning) {
    return res.status(409).json({ error: "Automation is already in progress." });
  }

  const { formData, autoSubmit } = req.body;
  if (!formData) {
    return res.status(400).json({ error: "formData is required." });
  }

  isAutomationRunning = true;
  latestLogs = [];

  const addLog = (msg) => {
    const logItem = `[${new Date().toLocaleTimeString()}] ${msg}`;
    console.log(logItem);
    latestLogs.push(logItem);
  };

  addLog("Starting Playwright automation...");

  let context;
  try {
    context = await createBrowserContext();
    const page = context.pages()[0] || (await context.newPage());

    const dataToFill = {
      ...DEFAULT_CONFIG,
      ...formData,
      autoSubmit: Boolean(autoSubmit)
    };

    await fillDailyCheckin(page, dataToFill, addLog);

    addLog("Form fill process completed!");

    res.json({
      success: true,
      message: autoSubmit
        ? "Form filled and submitted successfully!"
        : "Form filled up to Final page! You can review or submit it in the open browser.",
      logs: latestLogs
    });
  } catch (err) {
    addLog(`Error: ${err.message}`);
    console.error("Automation error:", err);
    res.status(500).json({ error: err.message, logs: latestLogs });
  } finally {
    isAutomationRunning = false;
    // Keep browser open if autoSubmit is false so the user can inspect/submit
    if (context && autoSubmit) {
      await page?.waitForTimeout?.(3000);
      await context.close().catch(() => {});
    }
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

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
