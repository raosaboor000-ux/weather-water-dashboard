/**
 * Groq-backed HydroSense AI chat (server-side only).
 * POST body: { prompt, context?, messages? }
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `You are HydroSense AI, the weather and water-level analyst for the AWS6 weather and dams dashboard.

Rules:
- Answer ONLY using the dashboard data supplied in each request (station weather and dam water levels).
- Focus on the personal weather station AWS6 / ITALAG18 and the dam network shown in this dashboard.
- Present readings as operational intelligence (e.g. "Temperature is 32°C…", "Tarbela is at 85% fill…").
- NEVER mention APIs, Groq, Weather Underground, Google Sheets, dummy data, preview mode, raw data, or data sources.
- If a value is unavailable, say "That reading is not available at the moment."
- Keep answers clear, professional, and concise. Use °C, km/h, mm, ft, and local time as given in the data.
- When recent conversation messages are included, use them to resolve follow-ups without asking the user to repeat context.
- You do not issue official flood warnings or operational orders.
- Do not invent values not present in the data.
- For dam questions, use spill status, storage status, fill %, trends, and levels from the dam block.
- For weather questions, use current station conditions from the weather block.`;

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
  const prior = Array.isArray(reqBody.messages) ? reqBody.messages.slice(-3) : [];

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...prior.filter((m) => m?.role && m?.content),
    { role: "user", content: buildUserMessage(prompt, context) },
  ];

  const timeoutMs = Number(env.GROQ_TIMEOUT_MS) || 20000;
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
        max_tokens: 1200,
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
        sources: ["HydroSense AI", "Station weather", "Dam levels"],
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
