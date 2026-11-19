# AutoForm

An AI-powered morning check-in and day plan automation tool for Evolvan's Google Form. It uses **Gemini** or **ChatGPT** to generate a plan and **Playwright** to fill the form, with a **React + Tailwind** chat UI.

AutoForm is licensed for authorized internal office use. See the [AutoForm Internal Use License](LICENSE).

> [!NOTE]
> This form is designed for submitting a **Day Plan in advance** (e.g. at the start of the day / morning check-in), not a retrospective end-of-day summary. All tasks and inputs reflect planned upcoming work.

---

## Features

- **Natural Language Chat**: Provide your upcoming day plan in plain English (e.g. `File AI 5:30 UI enhancements, AI Bid 3 hrs EB MCP integration` or `File AI 5h dev, Learning 3h NB explore AI tools`).
- **AI provider selection** lets you switch between Gemini and ChatGPT in Settings. Both map project shorthand to exact Google Form options.
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

## Desktop App

The Electron app keeps the same chat, form previews, and Google Forms workflows. It bundles the interface, Node.js, and the Chromium browser used by Playwright. Google Forms opens in a separate browser window for sign-in and review.

Authorized office team members can download the installer for their operating system from [GitHub Releases](https://github.com/Aryan-khairwal/google-forms-automation/releases). On Windows x64, run the `.exe` and open **AutoForm** from the Start menu. On Ubuntu or Debian x86-64, install the `.deb` with APT and open **AutoForm** from the applications menu.

```bash
sudo apt install ./autoform-1.0.3-amd64.deb
```

On first launch, add your AI provider key in **Settings**. The desktop app has its own conversation history, settings, and Google sign-in. It stores them under the desktop app’s local user data directory.

AutoForm checks GitHub Releases on startup and downloads available updates. Choose **Restart and update** to apply one, or use **Help → Check for Updates** to install it later. Press **Alt** if the application menu is hidden. On Linux, the package installer can ask for administrator approval. Install version 1.0.3 or later once to enable updates on an older installation.

To launch from source or build a local installer, run the matching command on the target operating system after `npm ci`.

```bash
npm run desktop        # Launch Electron with the local Playwright browser
npm run build:linux    # Produce a .deb under release/ on Linux
npm run build:windows  # Produce an x64 NSIS installer under release/ on Windows
```

The source launch uses the same prerequisites as the browser version, including `npm run setup:browser`. Building the Debian package also requires `dpkg`, `fakeroot`, and `zstd`. On systems that restrict Chromium’s sandbox for unpackaged development binaries, use the installed Debian package.

### Publishing a release

Commit the release with the version updated in `package.json` and `package-lock.json`, then push a matching tag such as `v1.0.3` or release branch such as `release/v1.0.3`. The [release workflow](.github/workflows/release.yml) runs the tests, builds both installers on native runners, and verifies the update metadata before publishing them together. Set the repository secrets `WINDOWS_SIGNING_CERTIFICATE` and `WINDOWS_SIGNING_PASSWORD` to sign Windows builds with a PFX certificate.

---

## Prerequisites

Before setting up, make sure you have:

1. **Node.js** (20.19+ on Node 20, or 22.12+; Node 22 or 24 recommended) installed:
   ```bash
   node -v
   ```
2. **Google Account** (Evolvan company email to access the form).
3. An API key for the provider you want to use. Gemini keys come from [Google AI Studio](https://aistudio.google.com/app/apikey), and ChatGPT uses an [OpenAI API key](https://platform.openai.com/api-keys).

---

## Setup Guide

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Aryan-khairwal/google-forms-automation.git
cd google-forms-automation

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

### 3. Configure an AI Provider

Start the app and open **Settings**. Choose **Gemini** or **ChatGPT** under **AI provider** and enter its API key. Before you click **Save settings**, use **Test API key**. For Gemini it checks access to the selected model, and for ChatGPT it sends a short test prompt. To switch providers later, select the other provider and save. Each provider keeps its own key and model. When you send a message, the selected provider receives the current chat and its day-plan preview.

You can also set these values in `.env` in the project directory. Only the active provider needs an API key.

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5-mini
```

Set `AI_PROVIDER=openai` to start with ChatGPT.

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
   Choose **Daily Check-in**, **Daily Status**, or **Leave Application** in the form selector. Changing the form starts a new conversation.
2. In the chat, type your day plan with up to four projects. Examples:
   - `File AI 5:30 UI enhancements, AI Bid 3 hrs EB MCP integration`
   - `File AI 5h frontend tasks, Learning 3:30 NB explore AI workflows`
   - `Total 8h, File AI 4:30 EB frontend fixes, AI Bid 3:30 API testing`
   - `File AI 8:30 full day bug fixes and documentation`
   - `Total 8h, CultBooking.com 2h review tickets, Restro Automation 2h test billing, File AI 2h check layouts, Learning 2h NB review Playwright docs`
3. Review the generated values in the right-hand **Day Plan Preview Card** (you can edit any field directly if needed).
4. Set **Auto-Submit**:
   - **OFF (Default)**. Playwright follows the sections for the projects in your preview, fills the Final section, and leaves the form open for your review.
   - **ON**. Playwright fills the form, clicks Submit, and waits for the confirmation screen.
5. Click **Confirm & Fill Day Plan with Playwright**.
6. Watch the real-time Playwright logs as each field is filled!

Use the conversation history to start a **New chat** or reopen an earlier one. Messages and the editable form preview are saved in the current browser. Use the delete button next to a chat to remove it from that browser.

You can start with partial details. The chat keeps your draft and asks for the next missing answer. For example, give the tasks for Project 3 first, then reply with `2 hours` when it asks for planned time.

### Daily Status and Leave Application

- **Daily Status** records completed work for the status date. Enter up to four projects with actual hours spent, hours billed, and equivalent billable hours. The app calculates the total and selects the full-day answer at 8 hours 30 minutes. For any other total, choose the reason in the preview.
- **Leave Application** defaults to **1 day** when you give a single date without a duration. For **Casual leave (Paid)**, coverage defaults to **None** and work completed defaults to **No**. Add any supporting document in Google Forms and submit the application there.

To record work for more projects, ask the chat to put that work under separate headings in **Project 4 → Tasks to be done**. The additional headings go in the task text and use the same form slot.

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm start` | Starts the Express server and serves the web UI at `http://localhost:3001` |
| `npm run dev` | Runs Vite dev server with hot-reload for frontend development |
| `npm run build` | Builds the React production bundle into `dist/` |
| `npm run desktop` | Builds the interface and opens the Electron desktop app |
| `npm run build:linux` | Builds the Linux desktop package with Playwright Chromium |
| `npm run build:windows` | Builds the Windows x64 NSIS installer with Playwright Chromium |
| `npm run setup:browser` | Installs Chromium and its system dependencies on supported Linux distributions |
| `npm run cli` | Runs direct headless/terminal Playwright automation using static config in `src/config/formData.js` |

---

## Troubleshooting

- **"Browser profile is already in use by another instance"**:
  You already have a Playwright Chromium window open. Close the existing Chromium window before starting a new run.
- **Footer or buttons cut off**:
  Chromium runs maximized with native viewport scaling. If you previously zoomed out manually, press **`Ctrl + 0`** in the Chromium window to reset zoom to 100%.
- **Model unavailable**. Check the model name and API key access for the active provider in Settings.
- **Port 3001 already in use**:
  You can specify a custom port: `PORT=3002 npm start`.
