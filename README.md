# Google Form AI Day Plan & Check-in Automation

An AI-powered morning check-in and day plan automation tool for Evolvan's Google Form using **LangChain**, **Google Gemini**, and **Playwright**, with a modern **React + Tailwind** chat UI.

> [!NOTE]
> This form is designed for submitting a **Day Plan in advance** (e.g. at the start of the day / morning check-in), not a retrospective end-of-day summary. All tasks and inputs reflect planned upcoming work.

---

## Features

- **Natural Language Chat**: Provide your upcoming day plan in plain English (e.g. `File AI 5:30 UI enhancements, AI Bid 3 hrs EB MCP integration` or `File AI 5h dev, Learning 3h NB explore AI tools`).
- **LangChain & Gemini Agent**: Maps project shorthand to exact Google Form dropdown options (e.g., `FileAI` → `File AI`, `AI Bid` → `Evolvan-AI Bid Writing`).
- **Smart Office Defaults**:
  - **Advance Day Planning**: Formulates tasks in forward-looking/plan tense ("Work on...", "Develop...", "Review...").
  - **Total Working Hours**: Defaults to **8:30** (`08:30:00`).
  - **Billable Hours (Default = Planned Hours)**: By default, billable hours match planned hours.
  - **Non-Billable (NB / Billable 0)**: If marked as non-billable (e.g. `NB`, `no billable`, `not billable`, `billable 0`), billable hours are automatically set to `00:00`.
  - **EB (Equivalent Billable)**: **False by default**. Only set to true if explicitly mentioned (`EB`, `EBH`, or `equivalent`).
  - **Blocker**: Defaults to **None**.
- **Interactive Review & Control**:
  - Live preview card lets you review or edit planned values before triggering Playwright.
  - **Auto-Submit Toggle**: Choose whether to automatically submit on the final page or keep the browser open for manual inspection.
  - Live Playwright log stream in the UI.

---

## Prerequisites

Before setting up, make sure you have:

1. **Node.js** (20.19+ on Node 20, or 22.12+; Node 22 or 24 recommended) installed:
   ```bash
   node -v
   ```
2. **Google Account** (Evolvan company email to access the form).
3. **Gemini API Key**: Free API key from [Google AI Studio](https://aistudio.google.com/).

---

## Setup Guide

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd google-form-automation

# Install the exact locked project dependencies
npm ci

# Install Playwright's Chromium browser and Linux system dependencies
# Installing system dependencies may request administrator privileges.
npm run setup:browser
```

### 2. Build the Web Interface

On Linux, use a Playwright-supported Debian or Ubuntu release on x86-64 or
ARM64 with a graphical desktop for Google sign-in and manual form review.
See [Playwright's system requirements](https://playwright.dev/docs/intro#system-requirements)
for supported releases. Other distributions may require manual browser library
installation. Alpine/musl is not supported by the bundled Playwright browsers;
removing `libc` fields from the lockfile does not change browser compatibility.
Keep those fields so npm can select the matching native packages. Install
dependencies separately on each machine; do not copy `node_modules/` between
systems.

Build the React + Tailwind frontend:
```bash
npm run build
```
*(Note: If you skip this, the server will also automatically build it on first run).*

### 3. Configure Gemini API Key

You can configure your key in either of two ways:

- **Option A (Via Web UI - Recommended)**: Launch the app (step 4), click **Settings** in the top-right corner, paste your API key, and click Save.
- **Option B (Via `.env` file)**: Create a `.env` file in the root directory:
  ```env
  GEMINI_API_KEY=your_gemini_api_key_here
  GEMINI_MODEL=gemini-3.8-flash
  ```

Supported models: `gemini-3.8-flash` (recommended), `gemini-3.8-flash-lite`, `gemini-3.5-flash-lite`.

### 4. Start the Application

```bash
npm start
```

Open your browser and navigate to:
**`http://localhost:3001`**

---

## First-Time Google Sign-in

On your **first automation run**:
1. Playwright will launch a Chromium browser window navigating to the Google Form.
2. If prompted with a Google login screen, **sign in to your Evolvan Google account once**.
3. Your login session is saved locally in the `google-profile/` directory. All subsequent runs will use this session automatically without asking you to sign in again.

> [!NOTE]
> `google-profile/` is strictly local and listed in `.gitignore`. Never commit or share your profile folder.

---

## Daily Usage

1. Open **`http://localhost:3001`**.
2. In the chat, type your day plan. Examples:
   - `File AI 5:30 UI enhancements, AI Bid 3 hrs EB MCP integration`
   - `File AI 5h frontend tasks, Learning 3:30 NB explore AI workflows`
   - `Total 8h, File AI 4:30 EB frontend fixes, AI Bid 3:30 API testing`
   - `File AI 8:30 full day bug fixes and documentation`
3. Review the generated values in the right-hand **Day Plan Preview Card** (you can edit any field directly if needed).
4. Set **Auto-Submit**:
   - **OFF (Default)**: Playwright fills Page 1 and Page 2 and leaves the browser open so you can review before clicking Submit yourself.
   - **ON**: Playwright fills all fields and clicks Submit automatically.
5. Click **Confirm & Fill Day Plan with Playwright**.
6. Watch the real-time Playwright logs as each field is filled!

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm start` | Starts the Express server and serves the web UI at `http://localhost:3001` |
| `npm run dev` | Runs Vite dev server with hot-reload for frontend development |
| `npm run build` | Builds the React production bundle into `dist/` |
| `npm run setup:browser` | Installs Chromium and its system dependencies on supported Linux distributions |
| `npm run cli` | Runs direct headless/terminal Playwright automation using static config in `src/config/formData.js` |

---

## Troubleshooting

- **"Browser profile is already in use by another instance"**:
  You already have a Playwright Chromium window open. Close the existing Chromium window before starting a new run.
- **Footer or buttons cut off**:
  Chromium runs maximized with native viewport scaling. If you previously zoomed out manually, press **`Ctrl + 0`** in the Chromium window to reset zoom to 100%.
- **Model 404 / Deprecated Error**:
  Ensure your `GEMINI_MODEL` is set to `gemini-3.8-flash` or `gemini-3.8-flash-lite` in Settings or `.env`.
- **Port 3001 already in use**:
  You can specify a custom port: `PORT=3002 npm start`.
