const { app, BrowserWindow, dialog, protocol, session, shell } = require("electron");
const { randomBytes } = require("node:crypto");
const { mkdirSync } = require("node:fs");
const path = require("node:path");
const { setupAutoUpdates } = require("./updates.cjs");

const APP_NAME = "AutoForm";
const SCHEME = "forms-assistant";
const APP_ORIGIN = `${SCHEME}://local`;
const EXTERNAL_LINKS = new Set([
  "https://aistudio.google.com/app/apikey",
  "https://platform.openai.com/api-keys"
]);
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'";

app.setName(APP_NAME);
// Retain the desktop profile created before the AutoForm rename.
const profileDirectory = path.join(app.getPath("appData"), "Google Forms Assistant");
mkdirSync(profileDirectory, { recursive: true, mode: 0o700 });
app.setPath("userData", profileDirectory);
app.setPath("sessionData", profileDirectory);
protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

let server;
let closeBrowserContexts;
let mainWindow;
let shuttingDown = false;

function isAppUrl(value) {
  const url = new URL(value);
  return url.protocol === `${SCHEME}:` && url.host === "local";
}

async function startDesktop() {
  process.env.FORMS_DATA_DIR = app.getPath("userData");
  if (app.isPackaged) {
    process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(process.resourcesPath, "playwright-browsers");
  }
  const browser = require("../src/browser/createBrowser");
  closeBrowserContexts = browser.closeBrowserContexts;
  const { startServer, isFormAutomationRunning } = require("../src/server");
  const token = randomBytes(32).toString("hex");
  server = await startServer({ port: 0, desktopToken: token });
  const endpoint = `http://127.0.0.1:${server.address().port}`;

  protocol.handle(SCHEME, async (request) => {
    if (!isAppUrl(request.url) || (request.initiatorOrigin && request.initiatorOrigin !== APP_ORIGIN)) {
      return new Response(null, { status: 403 });
    }
    const { pathname, search } = new URL(request.url);
    const headers = { "x-forms-desktop-token": token };
    const contentType = request.headers.get("content-type");
    if (contentType) headers["content-type"] = contentType;
    const body = request.body ? await request.arrayBuffer() : undefined;
    const response = await fetch(`${endpoint}${pathname}${search}`, { method: request.method, headers, body, redirect: "error" });
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("content-security-policy", CSP);
    return new Response(response.body, { status: response.status, headers: responseHeaders });
  });

  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));

  mainWindow = new BrowserWindow({
    title: APP_NAME,
    icon: path.join(__dirname, "../assets/branding/autoform-icon.png"),
    width: 1440,
    height: 920,
    minWidth: 520,
    minHeight: 520,
    backgroundColor: "#f1f5f9",
    autoHideMenuBar: true,
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false }
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isAppUrl(url)) event.preventDefault();
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (EXTERNAL_LINKS.has(url)) {
      shell.openExternal(url).catch((error) => dialog.showErrorBox("Could not open link", error.message));
    }
    return { action: "deny" };
  });
  mainWindow.once("ready-to-show", () => mainWindow.show());
  setupAutoUpdates(mainWindow, () => isFormAutomationRunning() || browser.hasOpenBrowserContexts());
  await mainWindow.loadURL(`${APP_ORIGIN}/`);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });
  app.whenReady().then(startDesktop).catch((error) => {
    dialog.showErrorBox(`Could not start ${APP_NAME}`, error.message);
    app.quit();
  });
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", (event) => {
    if (!server || shuttingDown) return;
    event.preventDefault();
    shuttingDown = true;
    server.close();
    server.closeAllConnections();
    closeBrowserContexts().finally(() => app.quit());
  });
}
