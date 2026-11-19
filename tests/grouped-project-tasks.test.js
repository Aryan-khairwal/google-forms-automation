const assert = require("node:assert/strict");
const { test } = require("node:test");
const { processUserMessage } = require("../src/agent/formAgent");
const { normalizeTaskText } = require("../src/utils/normalizeTaskText");

test("both providers receive the edited preview and instructions for grouped Project 4 tasks", async (t) => {
  const projects = ["CultBooking.com", "Restro Automation", "Aimantis", "Giga"].map((name) => ({
    name, planned: "01:00", billable: "01:00", ebhEquivalent: false, tasks: "Review the planned work."
  }));
  const currentPlan = {
    totalWork: "04:00",
    blocker: "None",
    projects,
    formUrl: "https://form.test/",
    autoSubmit: true
  };
  const tasks = "Giga project:-\nReview Giga site changes.\nVaidhakim:-\nCheck the chatbot.";
  const request = `Add both tasks under Project 4:\n${tasks}`;
  const groupedProjects = [...projects.slice(0, 3), { ...projects[3], tasks }];
  const seenProviders = [];

  t.mock.method(globalThis, "fetch", async (url, { body }) => {
    const { instructions, input, contents, systemInstruction, text } = JSON.parse(body);
    const openai = url === "https://api.openai.com/v1/responses";
    seenProviders.push(openai ? "openai" : "gemini");
    const prompt = openai ? instructions : systemInstruction.parts[0].text;
    const latest = openai ? input.at(-1).content : contents.at(-1).parts[0].text;
    assert.match(prompt, /headings in a single "tasks" string/);
    assert.match(prompt, /Preserve the existing Project 4 dropdown selection, planned time, billable time, and EBH/);
    assert.match(latest, /"name":"Giga","planned":"01:00"/);
    assert.ok(latest.endsWith(request));
    assert.doesNotMatch(latest, /form[.]test|autoSubmit/);
    if (openai) {
      const schema = text.format.schema.properties.formData.anyOf[1].properties.projects;
      assert.equal(schema.maxItems, 4);
      assert.match(schema.items.properties.tasks.description, /headings and line breaks/);
    }

    const result = JSON.stringify({
      message: "Both task headings are in Project 4.",
      isReady: true,
      needsClarification: false,
      clarificationQuestion: null,
      formData: {
        totalWork: "04:00",
        blocker: "None",
        projects: [...groupedProjects.slice(0, 3), { ...groupedProjects[3], tasks: tasks.replaceAll("\n", "\\n") }]
      }
    });
    return openai
      ? Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: result }] }] })
      : Response.json({ candidates: [{ content: { role: "model", parts: [{ text: result }] }, finishReason: "STOP" }] });
  });

  for (const provider of ["openai", "gemini"]) {
    const result = await processUserMessage([{ role: "user", content: request }], "test-key", undefined, provider, currentPlan);
    assert.equal(result.isReady, true);
    assert.deepEqual(result.formData.projects, groupedProjects);
  }
  assert.deepEqual(seenProviders, ["openai", "gemini"]);
});

test("keeps literal newline examples in ordinary task descriptions", () => {
  const task = "Document support for \\n in the importer.";
  assert.equal(normalizeTaskText(task), task);
});
