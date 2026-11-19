const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");

test("Gemini keys with periods can be tested, saved, and used for chat", async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "autoform-provider-settings-"));
  const envNames = ["FORMS_DATA_DIR", "AI_PROVIDER", "GEMINI_API_KEY", "GEMINI_MODEL"];
  const originalEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
  process.env.FORMS_DATA_DIR = dataDir;
  t.after(() => {
    for (const name of envNames) {
      if (originalEnv[name] === undefined) delete process.env[name];
      else process.env[name] = originalEnv[name];
    }
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  const { startServer } = require("../src/server");
  const server = await startServer({ port: 0 });
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const apiKey = "AQ.demo_key-for-tests";
  const model = "gemini-3.8-flash";
  const settings = { provider: "gemini", apiKey, model };
  const chat = { ...settings, messages: [{ role: "user", content: "Prepare a check-in." }] };
  const request = globalThis.fetch;
  let providerRequests = 0;
  let modelLookups = 0;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    const parsed = new URL(url);
    assert.equal(parsed.origin, "https://generativelanguage.googleapis.com");
    assert.equal(new Headers(options.headers).get("x-goog-api-key"), apiKey);
    providerRequests++;
    if (options.method === "GET") {
      assert.equal(parsed.pathname, `/v1beta/models/${model}`);
      assert.equal(options.body, undefined);
      modelLookups++;
      return Response.json({ name: `models/${model}` });
    }
    const text = JSON.stringify({ message: "Draft ready", formData: null });
    return Response.json({ candidates: [{ content: { role: "model", parts: [{ text }] }, finishReason: "STOP" }] });
  });

  const post = (route, payload) => request(`http://127.0.0.1:${server.address().port}/api/${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  assert.equal((await post("test-key", settings)).status, 200);
  const saved = await post("save-key", settings);
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).providers.gemini.hasApiKey, true);
  assert.match(fs.readFileSync(path.join(dataDir, ".env"), "utf8"), /^GEMINI_API_KEY=AQ\.demo_key-for-tests$/m);
  assert.equal((await post("chat", chat)).status, 200);
  assert.equal((await post("chat", { ...chat, apiKey: "" })).status, 200);

  assert.equal((await post("test-key", { ...settings, apiKey: "AQ.contains a space" })).status, 400);
  assert.equal((await post("save-key", { ...settings, apiKey: apiKey + "\n" })).status, 400);
  assert.equal((await post("chat", { ...chat, apiKey: "AQ.key#comment" })).status, 400);
  assert.equal(providerRequests, 3);
  assert.equal(modelLookups, 1);
});
