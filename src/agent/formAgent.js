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

const SYSTEM_PROMPT = `You are an intelligent assistant for Google Form automation for submitting daily day plans in advance.
Your job is to parse the user's natural language input into structured daily check-in form data, clarify anything ambiguous, and apply office defaults.

IMPORTANT CONTEXT - DAY PLAN IN ADVANCE:
This form is for submitting a DAY PLAN IN ADVANCE (e.g., morning check-in / start-of-day plan for today's upcoming work), NOT a retrospective end-of-day log.
- All tasks to be done and assistant messages must reflect an advance plan for the day ahead (e.g., "Work on frontend development", "Fix UI issues", "Implement MCP Integration", "Review tickets"), NEVER past tense (do NOT use "Worked on...", "Fixed...", "Tested...").

AVAILABLE PROJECTS IN GOOGLE FORM:
${AVAILABLE_PROJECTS.map((p) => `- "${p}"`).join("\n")}

DEFAULT RULES & PARSING LOGIC:
1. Total working hours ("totalWork"): Default is "08:30" (8 hours 30 mins). If user mentions another total (e.g., "total 8 hours", "working 7:30 today"), override with that.
2. Projects (maximum 2 projects supported on Page 1):
   - "name": MUST EXACTLY match one of the available project strings above. Map user abbreviations/shorthand to the exact string (e.g. "FileAI" -> "File AI", "AI Bid" or "Bid Writing" -> "Evolvan-AI Bid Writing", "Aura" -> "Aura Finance.ca").
   - "planned": Formatted as "HH:MM" (e.g., "05:30", "03:00").
   - "billable": Formatted as "HH:MM".
     * DEFAULT IS BILLABLE: By default, billable hours MUST BE EQUAL TO the planned hours (e.g., if planned is "03:00", billable is "03:00").
     * NON-BILLABLE (NB): If the user indicates that the hours or project is not billable using shorthand or phrases such as "NB", "nb", "non billable", "non-billable", "no billable", "No balliable", "not billable", "billable 0", "0 billable", "0 hours billable", "unbillable", or similar, set "billable" to "00:00".
     * SPECIFIC BILLABLE TIME: If the user explicitly mentions a different specific billable time (e.g., "5 hours planned, 3 hours billable"), set billable to that specific time.
   - "ebhEquivalent": Boolean.
     * DEFAULT IS FALSE: Equivalent billable (EB) MUST be false by default.
     * It is set to true ONLY if the user explicitly mentions "EB", "eb", "EBH", "ebh", "equivalent", or "equivalent billable".
     * If the user does not explicitly say "EB" or "equivalent", it MUST remain false.
   - "tasks": The planned task description to be done today (e.g., "Work on UI enhancements", "Implement MCP Integration"). Keep phrasing in forward-looking/infinitive form, never past tense.
3. "blocker": Default is "None" unless user mentions a blocker/impediment for today.
4. "anotherProject": "No" if 1 or 2 projects; "Yes" only if user mentions 3 or more projects.

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
    "anotherProject": "No",
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
    
    // Ensure formUrl, email, and safe defaults are present
    if (parsed.formData) {
      parsed.formData.formUrl = DEFAULT_CONFIG.formUrl;
      parsed.formData.email = DEFAULT_CONFIG.email;

      if (Array.isArray(parsed.formData.projects)) {
        parsed.formData.projects = parsed.formData.projects.map((proj) => ({
          ...proj,
          planned: proj.planned || "00:00",
          billable:
            proj.billable !== undefined && proj.billable !== null && String(proj.billable).trim() !== ""
              ? String(proj.billable).trim()
              : (proj.planned || "00:00"),
          ebhEquivalent: Boolean(proj.ebhEquivalent),
          tasks: proj.tasks || ""
        }));
      }
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

