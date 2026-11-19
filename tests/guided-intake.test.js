const assert = require("node:assert/strict");
const { test } = require("node:test");
const { processUserMessage } = require("../src/agent/formAgent");
const { getCheckinQuestion, getStatusValidationError, getLeaveValidationError } = require("../src/forms/formValidation");

const projects = [
  { name: "File AI", tasks: "Review the layout.", planned: "03:00", billable: null, ebhEquivalent: false },
  { name: "Learning", tasks: "Read the docs.", planned: "03:30", billable: "00:00", ebhEquivalent: false },
  { name: "Aimantis", tasks: "Review the pull request.", planned: "", billable: null, ebhEquivalent: false }
];
const question = "How much time will you work on Project 3?";

for (const provider of ["openai", "gemini"]) {
  test(`${provider} collects missing Project 3 hours without losing the existing draft`, async (t) => {
    let requestNumber = 0;
    t.mock.method(globalThis, "fetch", async (url, { body }) => {
      const request = JSON.parse(body);
      const openai = url === "https://api.openai.com/v1/responses";
      assert.equal(openai, provider === "openai");
      const prompt = openai ? request.instructions : request.systemInstruction.parts[0].text;
      assert.match(prompt, /ask one short question/);
      const latest = openai ? request.input.at(-1).content : request.contents.at(-1).parts[0].text;
      const followUp = requestNumber++ > 0;
      if (followUp) {
        assert.match(latest, /"name":"Aimantis","planned":""/);
        assert.match(latest, /LATEST REQUEST:\n2 hours$/);
        const previous = openai ? request.input.at(-2).content : request.contents.at(-2).parts[0].text;
        assert.equal(previous, question);
      }
      const text = JSON.stringify({
        message: followUp ? "Your draft is ready to review." : "Plan ready",
        isReady: true, needsClarification: false, clarificationQuestion: null,
        formData: {
          totalWork: "08:30", blocker: "None",
          projects: projects.map((project, index) => followUp && index === 2 ? { ...project, planned: "02:00" } : project)
        }
      });
      return openai
        ? Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text }] }] })
        : Response.json({ candidates: [{ content: { role: "model", parts: [{ text }] }, finishReason: "STOP" }] });
    });

    const messages = [{ role: "user", content: "Project 3 is Aimantis. I will review the pull request." }];
    const draft = await processUserMessage(messages, "test-key", undefined, provider);
    assert.equal(draft.clarificationQuestion, question);
    assert.equal(draft.message, question);
    assert.equal(draft.isReady, false);
    assert.equal(draft.formData.projects[2].planned, "");
    assert.equal(draft.formData.projects[2].tasks, projects[2].tasks);
    const complete = await processUserMessage([
      ...messages, { role: "assistant", content: question }, { role: "user", content: "2 hours" }
    ], "test-key", undefined, provider, draft.formData);
    assert.equal(complete.isReady, true);
    assert.equal(complete.formData.projects[2].planned, "02:00");
    assert.equal(complete.formData.projects[2].billable, null);
    assert.deepEqual(complete.formData.projects.slice(0, 2), projects.slice(0, 2));
  });
}

test("numbered tasks take priority and other forms ask their next unanswered question", () => {
  const draft = { projects: [{}, {}, { ...projects[2], name: "" }] };
  assert.equal(getCheckinQuestion(draft, 2), question);
  draft.projects[2].planned = "02:00";
  assert.match(getCheckinQuestion(draft, 2), /select for Project 3/);
  assert.match(getStatusValidationError({}), /status date/);
  assert.match(getLeaveValidationError({ name: "Test Employee" }), /type of leave/);
});
