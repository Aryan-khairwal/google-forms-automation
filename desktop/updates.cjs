const fs = require("node:fs");
const path = require("node:path");
const { app, dialog, Menu } = require("electron");

function setupAutoUpdates(window, isFormInUse) {
  if (!app.isPackaged || !fs.existsSync(path.join(process.resourcesPath, "app-update.yml"))) return;

  const { autoUpdater } = require("electron-updater");
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;

  let downloadedVersion;
  let checking = false;
  let prompting = false;
  const inform = (message, detail) => dialog.showMessageBox(window, { type: "info", message, detail });

  async function offerRestart(interactive = false) {
    if (prompting || window.isDestroyed()) return;
    if (isFormInUse()) {
      if (interactive) await inform("AutoForm update ready", "Close the Google Forms review window and finish any active form run before restarting.");
      return;
    }
    prompting = true;
    try {
      const { response } = await dialog.showMessageBox(window, {
        type: "info",
        message: `AutoForm ${downloadedVersion} is ready to install`,
        detail: "Restart AutoForm to apply the update. On Linux, installation can ask for your administrator password.",
        buttons: ["Restart and update", "Later"],
        defaultId: 1,
        cancelId: 1,
        noLink: true
      });
      if (response !== 0 || window.isDestroyed()) return;
      if (isFormInUse()) {
        await inform("AutoForm update ready", "Finish your form run and close its review window, then choose Check for Updates again.");
        return;
      }
      autoUpdater.quitAndInstall();
    } finally {
      prompting = false;
    }
  }

  async function checkForUpdates(interactive = false) {
    if (downloadedVersion) return offerRestart(interactive);
    if (checking) {
      if (interactive) await inform("AutoForm is checking for updates", "An available update will download automatically.");
      return;
    }
    checking = true;
    try {
      const result = await autoUpdater.checkForUpdates();
      if (result?.downloadPromise) await result.downloadPromise;
      else if (interactive && !result?.isUpdateAvailable && !window.isDestroyed()) {
        await inform("AutoForm is up to date", `You’re using AutoForm ${app.getVersion()}.`);
      }
    } catch {
      if (interactive && !window.isDestroyed()) {
        await inform("Could not check for updates", "Check your connection to GitHub Releases and try again.");
      }
    } finally {
      checking = false;
    }
  }

  autoUpdater.on("error", (error) => console.error("AutoForm updater:", error.message));
  autoUpdater.on("update-downloaded", ({ version }) => {
    downloadedVersion = version;
    offerRestart().catch(console.error);
  });

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: "fileMenu" },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
    {
      role: "help",
      submenu: [{ label: "Check for Updates…", click: () => checkForUpdates(true).catch(console.error) }]
    }
  ]));
  window.once("ready-to-show", () => checkForUpdates().catch(console.error));
}

module.exports = { setupAutoUpdates };
