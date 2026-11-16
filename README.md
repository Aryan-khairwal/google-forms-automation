# Google Form AI Check-in Automation

An AI-powered daily check-in automation tool for Evolvan's Google Form using **LangChain**, **Google Gemini**, and **Playwright**, with a modern **React + Tailwind** chat UI.

---

## Features

- **Natural Language Chat**: Provide brief daily updates (e.g., `FileAI 5:30 UI enhancements, AI Bid 3 hrs MCP Integration`).
- **LangChain & Google Gemini**: Maps shorthand project names (e.g. `FileAI` → `File AI`, `AI Bid` → `Evolvan-AI Bid Writing`) and converts notes into structured form data.
- **Smart Defaults**:
  - Total working hours default to **8:30** (`08:30:00`).
  - Billable hours default to **planned hours** (unless marked "not billable").
  - "EB" / "equivalent billable" automatically ticks the **EBH** checkbox.
  - "Any blocker?" defaults to **None**.
- **Interactive Review & Control**:
  - Live preview card lets you review or edit values before triggering Playwright.
  - **Auto-Submit Toggle**: Choose whether to automatically submit or keep the browser open for manual inspection.
  - Live Playwright log stream in the UI.

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
npx playwright install chromium
```

### 2. Configure Gemini API Key
Create a `.env` file in the root directory (or enter it in the UI Settings modal):
```env
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.0-flash
```

*(You can get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/)).*

### 3. Launch the Application
```bash
npm start
```
Open your browser at **`http://localhost:3001`**.

---

## Scripts

- **`npm start`**: Runs the Express backend and serves the React UI at `http://localhost:3001`.
- **`npm run dev`**: Starts Vite dev server with hot-reload for frontend development.
- **`npm run build`**: Builds the React UI into the `dist/` directory.
- **`npm run cli`**: Runs direct headless/terminal Playwright automation without the web UI.

---

## Privacy & Safety

- The `google-profile/` directory keeps your signed-in Google account session locally. It is ignored by `.git`.
- If `Auto-Submit` is disabled (default), Playwright fills all fields up to the final page and leaves the browser open for you to verify before submitting.
