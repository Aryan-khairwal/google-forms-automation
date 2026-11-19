const path = require("node:path");
const { chromium } = require("playwright");

const browserDirectory = path.dirname(path.dirname(chromium.executablePath()));

module.exports = {
  appId: "com.googleformsassistant.desktop",
  productName: "AutoForm",
  executableName: "google-forms-assistant",
  directories: { output: "release" },
  artifactName: "autoform-${version}-${arch}.${ext}",
  publish: {
    provider: "github",
    owner: "Aryan-khairwal",
    repo: "google-forms-automation",
    private: false
  },
  extraMetadata: {
    main: "desktop/main.cjs",
    homepage: "https://github.com/Aryan-khairwal/google-forms-automation"
  },
  files: [
    "desktop/*.cjs",
    "!desktop/build.config.cjs",
    "assets/branding/autoform-icon.png",
    "dist/**/*",
    "src/**/*.js",
    "src/**/*.mjs",
    "src/config/*.json"
  ],
  extraResources: [
    { from: browserDirectory, to: `playwright-browsers/${path.basename(browserDirectory)}` }
  ],
  linux: { category: "Office", icon: "assets/branding/autoform-icon.png", syncDesktopName: true },
  win: { icon: "assets/branding/autoform-icon.png" },
  nsis: { perMachine: false },
  deb: {
    compression: "zst",
    maintainer: "AutoForm <local@localhost>",
    depends: [
      "libgtk-3-0", "libnotify4", "libnss3", "libxss1", "libxtst6", "xdg-utils",
      "libatspi2.0-0", "libuuid1", "libsecret-1-0", "libgbm1", "libasound2t64 | libasound2"
    ]
  }
};
