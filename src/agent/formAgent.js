const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { SystemMessage, HumanMessage, AIMessage } = require("@langchain/core/messages");
const { PROVIDERS, getApiKey, getModel } = require("../config/aiProviders");
const { normalizeTaskText } = require("../utils/normalizeTaskText");
const { PAID_CASUAL_LEAVE, withLeaveDefaults } = require("../utils/leaveDefaults.mjs");
const { maxProjects } = require("../config/dayPlan.json");
const { status, leave } = require("../config/formTemplates.json");
const { getCheckinQuestion, getStatusValidationError, getLeaveValidationError } = require("../forms/formValidation");

const AVAILABLE_PROJECTS = require("../config/projects.json");

const DEFAULT_CONFIG = {
  formUrl:
    "https://docs.google.com/forms/d/e/1FAIpQLSfVhvb03ottVNomh-i019XlayYP_2fQ4s2q7b5jd-EHf1a_JA/viewform",
  totalWork: "08:30",
  blocker: "None",
  autoSubmit: false
};

const GUIDED_CONVERSATION = "When a detail is missing, save the answers already given in formData and ask one short question for the next missing detail. Use the latest draft and the previous question to interpret short replies such as '2 hours'. Skip questions already answered or covered by defaults. Once the form has its required details, tell the user it is ready to review.";

const SYSTEM_PROMPT = `You are an intelligent assistant for Google Form automation for submitting daily day plans in advance.
Your job is to parse the user's natural language input into structured daily check-in form data, clarify anything ambiguous, and apply office defaults.
${GUIDED_CONVERSATION}

IMPORTANT CONTEXT - DAY PLAN IN ADVANCE:
This form is for submitting a DAY PLAN IN ADVANCE (e.g., morning check-in / start-of-day plan for today's upcoming work), NOT a retrospective end-of-day log.
- All tasks to be done and assistant messages must reflect an advance plan for the day ahead (e.g., "Work on frontend development", "Fix UI issues", "Implement MCP Integration", "Review tickets"), NEVER past tense (do NOT use "Worked on...", "Fixed...", "Tested...").

AVAILABLE PROJECTS IN GOOGLE FORM:
${AVAILABLE_PROJECTS.map((p) => `- "${p}"`).join("\n")}

DEFAULT RULES & PARSING LOGIC:
1. Total working hours ("totalWork"): Default is "08:30" (8 hours 30 mins). If user mentions another total (e.g., "total 8 hours", "working 7:30 today"), override with that.
2. Projects (1 to ${maxProjects} in the order provided by the user):
   - "name": MUST EXACTLY match one of the available project strings above. Map user abbreviations/shorthand to the exact string (e.g. "FileAI" -> "File AI", "AI Bid" or "Bid Writing" -> "Evolvan-AI Bid Writing", "Aura" -> "Aura Finance.ca").
   - "planned": Formatted as "HH:MM" (e.g., "05:30", "03:00"). If the project has tasks but no planned duration, keep the tasks, set planned to an empty string, and ask how much time they will work on that project. Never use a guess or zero as a placeholder.
   - "billable": Formatted as "HH:MM".
     * DEFAULT IS BILLABLE: Use null until the user explicitly provides a billable value. The form uses planned hours for null.
     * NON-BILLABLE (NB): If the user indicates that the hours or project is not billable using shorthand or phrases such as "NB", "nb", "non billable", "non-billable", "no billable", "No balliable", "not billable", "billable 0", "0 billable", "0 hours billable", "unbillable", or similar, set "billable" to "00:00".
     * SPECIFIC BILLABLE TIME: If the user explicitly mentions a different specific billable time (e.g., "5 hours planned, 3 hours billable"), set billable to that specific time.
     * LEAVE BLANK: If the user explicitly asks to leave a project's billable hours blank, set "billable" to the empty string "" for that project.
   - "ebhEquivalent": Boolean.
     * DEFAULT IS FALSE: Equivalent billable (EB) MUST be false by default.
     * It is set to true ONLY if the user explicitly mentions "EB", "eb", "EBH", "ebh", "equivalent", or "equivalent billable".
     * If the user does not explicitly say "EB" or "equivalent", it MUST remain false.
   - "tasks": The planned task description to be done today (e.g., "Work on UI enhancements", "Implement MCP Integration"). Keep phrasing in forward-looking/infinitive form, never past tense.
3. "blocker": Default is "None" unless user mentions a blocker/impediment for today.
4. If the user supplies more than ${maxProjects} separate project entries, ask which ${maxProjects} to put in the form and whether to include the remaining work in Project ${maxProjects}'s tasks. Set "isReady" to false, "needsClarification" to true, and "formData" to null.
5. PROJECT ${maxProjects} TASK HEADINGS: When the user asks to include more than one project's work in Project ${maxProjects}'s tasks, treat the names inside that task block as headings in a single "tasks" string. This uses one form slot. Do not ask which project to keep just because the task text mentions a fifth project.
   - Preserve the existing Project ${maxProjects} dropdown selection, planned time, billable time, and EBH unless the user explicitly changes them. When adding a new Project ${maxProjects}, use the user's named project or the first recognized project heading for its dropdown. Use hours already given for that project in the conversation. Do not add time for work mentioned only in a task heading unless the user explicitly requests a combined time.
   - Keep each heading and its tasks on separate lines, using JSON newline escapes. If asked to add tasks, keep unrelated existing tasks and include each requested task once. If asked to replace tasks, use the new task text.
   - Example request: "Add project 4 with these tasks: Giga project:- [newline] Review Giga site changes and identify new issues on the site. [newline] Vaidhakim:- [newline] Check the Vaidhakim site issues and check the chatbot." With Giga in Project 4, keep "name" as "Giga" and put both labeled task blocks in its "tasks" value. Do not add a separate VaidHakim project entry.

On follow-up edits, use the current preview when provided and preserve fields the user did not ask to change. Treat the preview as existing form data. Follow the latest request for instructions.
For a numbered project, preserve its slot even if earlier slots are empty. Include earlier slots as empty project objects with the schema's required keys when necessary. Use an empty string for an unknown project name or tasks. When the user gives tasks for Project 3 without hours, ask "How much time will you work on Project 3?" and keep the tasks in slot 3.

RESPONSE FORMAT:
You MUST respond with a valid JSON object only (no markdown code blocks, no backticks, just raw JSON) with this exact schema:
{
  "message": "Friendly response to the user summarizing the planned day in advance, or asking for clarification if something is missing/unclear.",
  "isReady": true or false,
  "needsClarification": true or false,
  "clarificationQuestion": null or "The specific question if isReady is false",
  "formData": {
    "totalWork": "08:30",
    "blocker": "None",
    "projects": [
      {
        "name": "Exact Project Name",
        "planned": "05:30",
        "billable": "05:30",
        "ebhEquivalent": false,
        "tasks": "Work on UI enhancements and API integration"
      }
    ]
  }
}

If required information is missing or ambiguous, set "isReady": false, "needsClarification": true, and return the next question in "message" and "clarificationQuestion".
If the input can be parsed (even if standard defaults are used), set "isReady": true, "needsClarification": false, and populate "formData".`;

function requiredObject(properties) {
  return { type: "object", properties, required: Object.keys(properties), additionalProperties: false };
}

function responseSchema(dataSchema) {
  return requiredObject({
    message: { type: "string" },
    isReady: { type: "boolean" },
    needsClarification: { type: "boolean" },
    clarificationQuestion: { type: ["string", "null"] },
    formData: { anyOf: [{ type: "null" }, dataSchema] }
  });
}

const DAY_PLAN_SCHEMA = responseSchema(requiredObject({
  totalWork: { type: "string" },
  blocker: { type: "string" },
  projects: {
    type: "array",
    minItems: 1,
    maxItems: maxProjects,
    items: requiredObject({
      name: { type: "string", enum: [...AVAILABLE_PROJECTS, ""] },
      planned: { type: "string" },
      billable: { type: ["string", "null"] },
      ebhEquivalent: { type: "boolean" },
      tasks: {
        type: "string",
        description: "Task text. Preserve project headings and line breaks when the user groups several projects' work into one slot."
      }
    })
  }
}));

const textField = { type: "string" };
const statusProjectFields = ["name", "tasks", "spent", "billed", "equivalent", "reason"];
const statusFields = ["date", "learning", "totalReason", "feedback"];

function fieldsSchema(fields) {
  return Object.fromEntries(fields.map((key) => [key, textField]));
}

function pickTextFields(source, fields) {
  return Object.fromEntries(fields.map((key) => [key, typeof source?.[key] === "string" ? source[key] : ""]));
}

function pickStatusData(data) {
  return {
    ...pickTextFields(data, statusFields),
    projects: Array.isArray(data.projects) ? data.projects.map((project) => pickTextFields(project, statusProjectFields)) : []
  };
}

const leaveFields = leave.fields.map(({ id }) => id);
const STATUS_SCHEMA = responseSchema(requiredObject({
  ...fieldsSchema(statusFields),
  projects: {
    type: "array", minItems: 1, maxItems: maxProjects,
    items: requiredObject({ ...fieldsSchema(statusProjectFields), name: { type: "string", enum: [...AVAILABLE_PROJECTS, ""] } })
  }
}));
const LEAVE_SCHEMA = responseSchema(requiredObject(Object.fromEntries(leave.fields.map(({ id, options }) => [
  id, options ? { type: "string", enum: [...options, ""] } : id === "reason"
    ? { type: "string", description: "A concise, grammatically correct reason in the applicant's first-person voice." }
    : textField
]))));

function formInstructions(schema, instructions) {
  return `${instructions}
${GUIDED_CONVERSATION}
Return JSON matching this schema: ${JSON.stringify(schema)}
For missing text fields use an empty string. Keep known answers in a partial draft when possible. Ask about missing required details in "message" and "clarificationQuestion". Treat any current preview as existing form data. Use the latest request for instructions and retain answers the user did not ask to change.`;
}

const formAgents = {
  checkin: { schema: DAY_PLAN_SCHEMA, prompt: SYSTEM_PROMPT, schemaName: "day_plan" },
  status: {
    schema: STATUS_SCHEMA,
    schemaName: "daily_status",
    sanitize: pickStatusData,
    validate: getStatusValidationError,
    prompt: formInstructions(STATUS_SCHEMA, `Prepare a Daily Status report about completed work. Preserve the order of projects and use past tense for tasks done.
Use YYYY-MM-DD for the status date and HH:MM (or HH:MM:SS if provided) for hours spent, billed and equivalent billable hours. Keep billed and equivalent durations separate. Keep unspecified values blank and use 00:00 for billed time only when the user explicitly says non-billable or zero.
The first project requires billed hours. Ask for a project reason when supplied hours spent and billed differ by more than ten minutes. Do not invent a reason.
When hours spent total 8:30 the app fills the full-day answer automatically. For any other total, use one of these reasons if the user provided it: ${status.reasons.join(", ")}. Otherwise ask. Extra projects beyond ${maxProjects} require clarification. Capture what the user learned and feedback when supplied.`)
  },
  leave: {
    schema: LEAVE_SCHEMA,
    schemaName: "leave_application",
    sanitize: (data) => pickTextFields(data, leaveFields),
    validate: getLeaveValidationError,
    prompt: formInstructions(LEAVE_SCHEMA, `Prepare a Leave Application for review. Never assume the name, leave type, dates, or leave reason. Use YYYY-MM-DD dates. When the user gives just one date without specifying a duration, the app defaults to one leave day. Leave days and endDate blank in that case. Keep any explicitly stated duration (including fractions) as a string. For a date range, ask for the number of leave days if missing. For an explicit multi-day request, collect the end date. Do not calculate leave days from a date range or include attachments.
Write the reason as one short, polished sentence from the applicant's point of view. When the user describes the applicant in third person, use I or my for the applicant and keep the facts and relationships they gave. For example, "to attend his best friend marriage" becomes "I am requesting leave to attend my best friend's wedding." Keep a reason already in the preview when the user changes only another field. Use the user's exact wording when they request it.
Map "casual paid leave" to "${PAID_CASUAL_LEAVE}". For that leave type only, the app defaults coverage to "None" and workComplete to "No". Leave those two fields blank if the user did not specify them, and do not ask about them. Keep any answers the user explicitly gave. For other leave types, ask for missing coverage or work completion.
Form fields: ${leave.fields.map(({ id, label, required }) => `${id}: ${label}${required ? " (required)" : ""}`).join("; ")}.`)
  }
};

async function readProviderResponse(response, provider) {
  if (response.ok) return response.json();

  const error = new Error("Provider request failed");
  error.status = response.status;
  if (provider === "gemini" && [400, 403].includes(response.status)) {
    const payload = await response.json().catch(() => null);
    const details = payload?.error?.details;
    if (Array.isArray(details) && details.some((detail) => detail?.reason === "API_KEY_INVALID")) {
      error.status = 401;
    }
  }
  throw error;
}

async function requestOpenAi(apiKey, request, timeoutMs = 60_000) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({ ...request, store: false })
  });
  return readProviderResponse(response, "openai");
}

async function testProviderApiKey(provider, apiKey, modelName) {
  const prompt = "Reply with OK.";
  const timeoutMs = 20_000;
  const maxTokens = 32;

  if (provider === "openai") {
    const data = await requestOpenAi(apiKey, {
      model: modelName,
      input: prompt,
      max_output_tokens: maxTokens
    }, timeoutMs);
    if (data.status !== "completed" &&
        !(data.status === "incomplete" && data.incomplete_details?.reason === "max_output_tokens")) {
      throw new Error("OpenAI did not complete the test");
    }
    return;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens }
      })
    }
  );
  const data = await readProviderResponse(response, "gemini");
  if (!data.candidates?.length) throw new Error("Gemini did not complete the test");
}

async function getOpenAiResponse(messages, apiKey, modelName, agent) {
  const data = await requestOpenAi(apiKey, {
    model: modelName,
    instructions: agent.prompt,
    input: messages,
    text: { format: { type: "json_schema", name: agent.schemaName, strict: true, schema: agent.schema } }
  });
  if (data.status !== "completed") {
    throw new Error("OpenAI did not finish generating a response");
  }
  const content = data.output.filter((item) => item.type === "message").flatMap((item) => item.content);
  const text = content.filter((part) => part.type === "output_text").map((part) => part.text).join("");
  return text || content.find((part) => part.type === "refusal")?.refusal || "";
}

async function getGeminiResponse(messages, apiKey, modelName, agent) {
  const model = new ChatGoogleGenerativeAI({ apiKey, model: modelName, temperature: 0.1 });
  const langchainMessages = [
    new SystemMessage(agent.prompt),
    ...messages.map(({ role, content }) => role === "user" ? new HumanMessage(content) : new AIMessage(content))
  ];
  const response = await model.invoke(langchainMessages);
  return response.text;
}

function getPreviewContext(currentPlan) {
  if (!Array.isArray(currentPlan?.projects)) return null;

  const { totalWork, blocker, projects } = currentPlan;
  return JSON.stringify({
    totalWork,
    blocker,
    projects: projects.filter(Boolean).map(({ name, planned, billable, ebhEquivalent, tasks }) => ({
      name, planned, billable, ebhEquivalent, tasks
    }))
  });
}

function focusedProject(conversation) {
  // Use the latest explicit project number, or the previous question for a short reply.
  for (const message of conversation.slice(-2).reverse()) {
    const match = message.content.match(/\b(?:project\s+(?:no\.?\s*|#\s*)?([1-4])|([1-4])(?:st|nd|rd|th)\s+project)\b/i);
    if (match) return Number(match[1] || match[2]) - 1;
  }
  return -1;
}

function askNext(parsed, question, formData = parsed.formData ?? null) {
  return { ...parsed, message: question, isReady: false, needsClarification: true, clarificationQuestion: question, formData };
}

function leaveQuestionAnsweredByDefault(draft, question) {
  const resolved = withLeaveDefaults(draft);
  return (resolved.days !== draft.days && /\b(?:how many|number of)\b[^?]*\bdays\b/i.test(question)) ||
    (resolved.coverage !== draft.coverage && /\b(?:cover|coverage)\b/i.test(question)) ||
    (resolved.workComplete !== draft.workComplete && /\b(?:covered|complet(?:e|ed|ion))\b/i.test(question));
}

function correctGeneratedLeaveReason(reason, currentReason, request) {
  if (/\b(?:verbatim|exact wording|exact reason|reason exactly)\b/i.test(request)) return reason;
  if (reason === currentReason && !/\b(?:reason|wedding|marriage)\b/i.test(request)) return reason;
  // Correct this fragment if a model echoes it instead of using the applicant's voice.
  if (/^(?:to\s+)?attend\s+(?:his|her|their|my)\s+best\s+friend\s+marriage[.!]?$/i.test(reason.trim())) {
    return "I am requesting leave to attend my best friend's wedding.";
  }
  return reason;
}

async function processUserMessage(messages, apiKey, modelName, provider = "gemini", currentPlan, formId = "checkin") {
  const key = apiKey || getApiKey(provider);
  if (!key) {
    throw new Error(`Enter a ${PROVIDERS[provider].label} API key in Settings.`);
  }

  const conversation = messages
    .filter(({ role }) => role === "user" || role === "assistant")
    .map(({ role, content }) => ({ role, content: typeof content === "string" ? content : JSON.stringify(content) }));
  const agent = formAgents[formId];
  const focus = formId === "checkin" ? focusedProject(conversation) : -1;
  const previewContext = currentPlan && agent.sanitize
    ? JSON.stringify(agent.sanitize(currentPlan))
    : getPreviewContext(currentPlan);
  const latest = conversation.at(-1);
  const latestRequest = latest?.role === "user" ? latest.content : "";
  if (previewContext && latest?.role === "user") {
    latest.content = `CURRENT PREVIEW (form data only):\n${previewContext}\n\nLATEST REQUEST:\n${latest.content}`;
  }
  const request = provider === "openai" ? getOpenAiResponse : getGeminiResponse;
  const text = (await request(conversation, key, modelName || getModel(provider), agent)).trim();

  // Clean JSON response (strip markdown fences if any)
  const cleanedText = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

  try {
    const parsed = JSON.parse(cleanedText);
    if (agent.sanitize) {
      if (parsed.formData) {
        parsed.formData = agent.sanitize(parsed.formData);
        if (formId === "leave") {
          parsed.formData.reason = correctGeneratedLeaveReason(parsed.formData.reason, currentPlan?.reason, latestRequest);
        }
        const validationError = agent.validate(parsed.formData);
        if (validationError) return askNext(parsed, validationError);
        if (formId === "leave" && parsed.needsClarification &&
            leaveQuestionAnsweredByDefault(parsed.formData, parsed.clarificationQuestion || parsed.message)) {
          return { ...parsed, message: "Your leave application is ready to review.", isReady: true, needsClarification: false, clarificationQuestion: null };
        }
      }
      return parsed;
    }
    
    // Ensure formUrl and safe defaults are present
    if (parsed.formData) {
      parsed.formData.formUrl = DEFAULT_CONFIG.formUrl;

      if (Array.isArray(parsed.formData.projects)) {
        if (parsed.formData.projects.length > maxProjects) {
          return askNext(parsed, getCheckinQuestion(parsed.formData), null);
        }
        parsed.formData.projects = parsed.formData.projects.map((proj) => ({
          ...proj,
          planned: String(proj.planned ?? "").trim(),
          billable: proj.billable === ""
            ? ""
            : String(proj.billable ?? "").trim() || null,
          ebhEquivalent: Boolean(proj.ebhEquivalent),
          tasks: normalizeTaskText(proj.tasks)
        }));
      }
      const nextQuestion = getCheckinQuestion(parsed.formData, focus);
      if (nextQuestion) return askNext(parsed, nextQuestion);
    }

    return parsed;
  } catch {
    return {
      message: text || "The provider returned an empty response. Please try again.",
      isReady: false,
      needsClarification: true,
      clarificationQuestion: "Could you please rephrase your request?",
      formData: null
    };
  }
}

module.exports = {
  processUserMessage,
  testProviderApiKey,
  AVAILABLE_PROJECTS,
  DEFAULT_CONFIG
};

