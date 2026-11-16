const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { SystemMessage, HumanMessage, AIMessage } = require("@langchain/core/messages");

const AVAILABLE_PROJECTS = [
  "Aimantis",
  "Aura Finance.ca",
  "Channi Singh E-Commerce",
  "Conjoin App",
  "File AI",
  "CSY",
  "CultBooking.com",
  "Evolvan.com",
  "Evolvan-AI Bid Writing",
  "EvoBot",
  "Giga",
  "Git Contribution",
  "Kelli - Cuisine",
  "KSA Infomatrix",
  "Learning",
  "Louise - Voice Note AI MVP",
  "Mindvize",
  "Ops Pilot",
  "Others Tasks",
  "Operations Hub",
  "Portfolio Projects",
  "Restro Automation",
  "UW n8n Automation",
  "VaidHakim - Dev",
  "VNTCI Web",
  "WP Property Suite",
  "Yoho Learning",
  "Yoho"
];

const DEFAULT_CONFIG = {
  formUrl:
    "https://docs.google.com/forms/d/e/1FAIpQLSfVhvb03ottVNomh-i019XlayYP_2fQ4s2q7b5jd-EHf1a_JA/viewform",
  email: "aryank@evolvan.com",
  totalWork: "08:30",
  blocker: "None",
  anotherProject: "No",
  autoSubmit: false
};

const SYSTEM_PROMPT = `You are an intelligent assistant for daily check-in Google Form automation.
Your job is to parse the user's natural language input into structured daily check-in form data, clarify anything ambiguous, and apply office defaults.

AVAILABLE PROJECTS IN GOOGLE FORM:
${AVAILABLE_PROJECTS.map((p) => `- "${p}"`).join("\n")}

DEFAULT RULES:
1. Total working hours ("totalWork"): Default is "08:30" (8 hours 30 mins). If user mentions another total (e.g., "total 8 hours", "working 7:30 today"), override with that.
2. Projects (maximum 2 projects supported on Page 1):
   - "name": MUST EXACTLY match one of the available project strings above. Map user abbreviations/shorthand to the exact string (e.g. "FileAI" -> "File AI", "AI Bid" or "Bid Writing" -> "Evolvan-AI Bid Writing", "Aura" -> "Aura Finance.ca").
   - "planned": Formatted as "HH:MM" (e.g., "05:30", "03:00").
   - "billable": By default, EQUAL TO planned hours! If the user explicitly says "not billable" or "0 billable", set to "00:00". If user mentions a specific billable time, use that.
   - "ebhEquivalent": Boolean. Set to true if the user mentions "EB", "EBH", or "equivalent billable". Default is false.
   - "tasks": The task description provided by user (e.g. "UI enhancements", "MCP Integration").
3. "blocker": Default is "None" unless user mentions a blocker/impediment.
4. "anotherProject": "No" if 1 or 2 projects; "Yes" only if user mentions 3 or more projects.

RESPONSE FORMAT:
You MUST respond with a valid JSON object only (no markdown code blocks, no backticks, just raw JSON) with this exact schema:
{
  "message": "Friendly response to the user summarizing what has been planned, or asking for clarification if something is missing/unclear.",
  "isReady": true or false,
  "needsClarification": true or false,
  "clarificationQuestion": null or "The specific question if isReady is false",
  "formData": {
    "totalWork": "08:30",
    "blocker": "None",
    "anotherProject": "No",
    "projects": [
      {
        "name": "Exact Project Name",
        "planned": "05:30",
        "billable": "05:30",
        "ebhEquivalent": false,
        "tasks": "Description of tasks"
      }
    ]
  }
}

If the user's input is ambiguous (e.g. project cannot be matched, or task is completely unclear), set "isReady": false, "needsClarification": true, and explain in "message" and "clarificationQuestion".
If the input can be parsed (even if standard defaults are used), set "isReady": true, "needsClarification": false, and populate "formData".`;

async function processUserMessage(messages, apiKey, modelName = "gemini-3.8-flash") {
  const key = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set. Please provide your Gemini API key in .env or the UI.");
  }

  const model = new ChatGoogleGenerativeAI({
    apiKey: key,
    model: modelName,
    temperature: 0.1
  });

  const langchainMessages = [new SystemMessage(SYSTEM_PROMPT)];

  for (const m of messages) {
    if (m.role === "user") {
      langchainMessages.push(new HumanMessage(m.content));
    } else if (m.role === "assistant") {
      langchainMessages.push(new AIMessage(typeof m.content === "string" ? m.content : JSON.stringify(m.content)));
    }
  }

  const response = await model.invoke(langchainMessages);
  const text = response.content.toString().trim();

  // Clean JSON response (strip markdown fences if any)
  const cleanedText = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

  try {
    const parsed = JSON.parse(cleanedText);
    
    // Ensure formUrl and email are present
    if (parsed.formData) {
      parsed.formData.formUrl = DEFAULT_CONFIG.formUrl;
      parsed.formData.email = DEFAULT_CONFIG.email;
    }

    return parsed;
  } catch (err) {
    console.error("Failed to parse Gemini response as JSON:", text);
    return {
      message: text,
      isReady: false,
      needsClarification: true,
      clarificationQuestion: "Could you please rephrase your request?",
      formData: null
    };
  }
}

module.exports = {
  processUserMessage,
  AVAILABLE_PROJECTS,
  DEFAULT_CONFIG
};

