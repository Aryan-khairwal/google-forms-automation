const PROVIDERS = {
  gemini: {
    label: "Gemini",
    keyEnv: "GEMINI_API_KEY",
    modelEnv: "GEMINI_MODEL",
    models: [
      "gemini-3.8-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash-lite",
      "gemini-flash-latest",
      "gemini-flash-lite-latest"
    ]
  },
  openai: {
    label: "ChatGPT",
    keyEnv: "OPENAI_API_KEY",
    modelEnv: "OPENAI_MODEL",
    models: ["gpt-5-mini"]
  }
};

function getActiveProvider() {
  return Object.hasOwn(PROVIDERS, process.env.AI_PROVIDER) ? process.env.AI_PROVIDER : "gemini";
}

function getApiKey(provider) {
  return process.env[PROVIDERS[provider].keyEnv] ||
    (provider === "gemini" ? process.env.GOOGLE_API_KEY : undefined);
}

function getModel(provider) {
  const { modelEnv, models } = PROVIDERS[provider];
  return process.env[modelEnv] || models[0];
}

function getPublicSettings() {
  return {
    provider: getActiveProvider(),
    providers: Object.fromEntries(Object.entries(PROVIDERS).map(([id, { label, models }]) => [
      id,
      { label, models, model: getModel(id), hasApiKey: Boolean(getApiKey(id)) }
    ]))
  };
}

module.exports = { PROVIDERS, getActiveProvider, getApiKey, getModel, getPublicSettings };
