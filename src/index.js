const readline = require("node:readline/promises");
const { stdin: input, stdout: output } = require("node:process");

const formData = require("./config/formData");
const { createBrowserContext } = require("./browser/createBrowser");
const { fillDailyCheckin } = require("./forms/dailyCheckinForm");

async function main() {
  let context;

  try {
    context = await createBrowserContext();

    const page = context.pages()[0] || await context.newPage();

    await fillDailyCheckin(page, formData);

    console.log("\nIMPORTANT: The form has NOT been submitted.");
    console.log("Check every field in the browser.");
    console.log("Submit it manually only after you have verified the values.");

    const rl = readline.createInterface({ input, output });
    await rl.question("\nPress Enter here when you are finished reviewing...");
    rl.close();
    } catch (error) {
    console.error("Automation failed:", error);
    console.log("\nBrowser will remain open so you can inspect the issue.");

    if (context) {
      const rl = readline.createInterface({ input, output });

      await rl.question(
        "\nPress Enter when you want to close the browser..."
      );

      rl.close();
    }

    process.exitCode = 1;
  } finally {
    if (context) {
      await context.close();
    }
  }
}

main();
