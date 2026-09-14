/**
 * Groq-backed HydroSense AI chat (server-side only).
 * POST body: { prompt, context?, messages? }
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `You are HydroSense AI, the weather and water-level analyst for the AWS6 weather and dams dashboard.

Rules:
- Answer ONLY using the dashboard data supplied in each request. That block may include live station weather, weather history summaries (7/30-day stats and recent daily rows), dam network KPIs, named spill/below-dead lists, dam design levels (DSL/NPL/HFL), and recent level series for notable dams.
- Focus on the personal weather station AWS6 / ITALAG18 and the dam network shown in this dashboard.
- Present readings as operational intelligence (e.g. "Temperature is 32°C…", "Tarbela is at 85% fill…").
- NEVER mention APIs, Groq, Weather Underground, Google Sheets, dummy data, preview mode, raw data, or data sources.
- If a value is unavailable, say "That reading is not available at the moment."
- Match answer depth and TOPIC to the question:
  - If the user asks only about dams / reservoirs / spill / storage, answer with dam data only — do NOT include station weather or weather history.
  - If the user asks only about weather / temperature / rain / trends, answer with weather data only — do NOT include the dam network.
  - Short factual questions get a tight reply.
  - Briefing / multi-topic overview questions should be structured and cover every requested topic (live weather, recent weather trends when present, dam priorities).
- When the user asks for a briefing or anything covering multiple topics (weather + history + dams), you MUST address EVERY requested topic in the same reply. Never answer only the weather/history part and defer dams to a follow-up.
- Prefer clear sections with short headings and bullet points (•) or numbered lists for any multi-item answer (briefings, dam summaries, trends). Never dump everything into one long paragraph.
- Do not invent values not present in the data.
- Use °C, km/h, mm, ft, and local time as given in the data.
- When recent conversation messages are included, use them to resolve follow-ups without asking the user to repeat context.
- You do not issue official flood warnings or operational orders.
- For dam questions, use spill status, storage status, fill %, DSL/NPL/HFL, river/catchment when present, 7d trends, and any recent level series.
- For weather questions, use live station conditions plus history summaries/daily rows when the user asks about trends, recent days, or comparisons.`;

export type ChatMessage = { role: string; content: string };

export type ChatRequestBody = {
  prompt?: string;
  context?: { llmBlock?: string; [key: string]: unknown };
  messages?: ChatMessage[];
};

export type ChatHandlerResult = {
  status: number;
  body: Record<string, unknown>;
};

function buildUserMessage(
  prompt: string,
  context: ChatRequestBody["context"] = {}
): string {
  const block =
    typeof context?.llmBlock === "string" && context.llmBlock.trim()
      ? context.llmBlock.trim()
      : "No live dashboard data was supplied.";
  return `${block}\n\nUser question: ${prompt}`;
}

export async function handleHydroSenseChat(
  reqBody: ChatRequestBody,
  env: NodeJS.ProcessEnv = process.env
): Promise<ChatHandlerResult> {
  const apiKey = env.GROQ_API_KEY?.trim();
  const prompt = String(reqBody?.prompt ?? "").trim();

  if (!prompt) {
    if (apiKey) {
      return { status: 200, body: { ok: true, ready: true } };
    }
    return {
      status: 503,
      body: {
        error: "Service unavailable",
        detail: "Intelligence service not configured",
      },
    };
  }

  if (!apiKey) {
    return {
      status: 503,
      body: {
        error: "Service unavailable",
        detail: "Intelligence service not configured",
      },
    };
  }

  const model = env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";
  const context = reqBody.context ?? {};
  const prior = Array.isArray(reqBody.messages) ? reqBody.messages.slice(-5) : [];

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...prior.filter((m) => m?.role && m?.content),
    { role: "user", content: buildUserMessage(prompt, context) },
  ];

  const timeoutMs = Number(env.GROQ_TIMEOUT_MS) || 25000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        max_tokens: 2000,
      }),
      signal: ctrl.signal,
    });

    const data = (await res.json().catch(() => ({}))) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    };

    if (!res.ok) {
      return {
        status: res.status,
        body: {
          error: "Analysis unavailable",
          detail: data?.error?.message || res.statusText,
        },
      };
    }

    const answer =
      data?.choices?.[0]?.message?.content?.trim() ||
      "I could not generate a response. Please try again.";

    return {
      status: 200,
      body: {
        answer,
        text: answer,
        sources: [
          "HydroSense AI",
          "Station weather",
          "Weather history",
          "Dam levels",
        ],
        model,
      },
    };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      status: aborted ? 504 : 502,
      body: {
        error: aborted ? "Request timed out" : "Analysis unavailable",
        detail: err instanceof Error ? err.message : "Unknown error",
      },
    };
  } finally {
    clearTimeout(timer);
  }
}
