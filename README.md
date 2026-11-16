# Google Form Automation

## Setup

```bash
npm install
npx playwright install chromium
```

## Run

```bash
npm start
```

On the first run, sign in to Google in the opened Chromium window if prompted.
The `google-profile/` directory stores this browser session locally.

## Before running

Edit `src/config/formData.js`:

- `totalWork`: total working time
- `projects[0]`: Project 1 values
- `projects[1]`: Project 2 values
- `anotherProject`: `"Yes"` or `"No"`

Project names must exactly match the options in the Google Form dropdown.

Time values are entered as separate hours, minutes, and seconds.

## Submission safety

The script fills the form but does not click Submit. Review the browser page and
submit manually.

## Notes

- This uses Playwright's bundled Chromium, not Brave or the system Chrome.
- Do not share or commit `google-profile/`; it contains your signed-in session.
