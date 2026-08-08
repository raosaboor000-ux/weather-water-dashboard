/**
 * Groq Whisper transcription for mobile voice input fallback.
 * POST body: { audio: base64, mime? }
 */

const GROQ_TRANSCRIBE_URL =
  "https://api.groq.com/openai/v1/audio/transcriptions";
const MAX_BYTES = 4 * 1024 * 1024;

export type TranscribeRequestBody = {
  audio?: string;
  mime?: string;
};

export type TranscribeHandlerResult = {
  status: number;
  body: Record<string, unknown>;
};

function extForMime(mime: string): string {
  const m = String(mime || "").toLowerCase();
  if (m.includes("mp4") || m.includes("m4a") || m.includes("aac")) return "m4a";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("wav")) return "wav";
  return "webm";
}

export async function handleHydroSenseTranscribe(
  reqBody: TranscribeRequestBody,
  env: NodeJS.ProcessEnv = process.env
): Promise<TranscribeHandlerResult> {
  const apiKey = env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return {
      status: 503,
      body: {
        error: "Service unavailable",
        detail: "Transcription service not configured",
      },
    };
  }

  const b64 = String(reqBody?.audio ?? "").trim();
  if (!b64) {
    return { status: 400, body: { error: "audio required" } };
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(b64, "base64");
  } catch {
    return { status: 400, body: { error: "Invalid audio encoding" } };
  }

  if (buffer.length > MAX_BYTES) {
    return { status: 413, body: { error: "Audio too large", detail: "Max 4 MB" } };
  }

  if (buffer.length < 256) {
    return {
      status: 400,
      body: { error: "Audio too short", detail: "Speak a little longer" },
    };
  }

  const mime = String(reqBody?.mime || "audio/webm");
  const ext = extForMime(mime);
  const model = env.GROQ_WHISPER_MODEL?.trim() || "whisper-large-v3";

  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(buffer)], { type: mime }),
    `hydrosense.${ext}`
  );
  form.append("model", model);
  form.append("language", "en");
  form.append("response_format", "json");
  form.append("temperature", "0");

  const timeoutMs = Number(env.GROQ_TIMEOUT_MS) || 20000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(GROQ_TRANSCRIBE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: ctrl.signal,
    });

    const data = (await res.json().catch(() => ({}))) as {
      text?: string;
      error?: { message?: string };
    };

    if (!res.ok) {
      return {
        status: res.status,
        body: {
          error: "Transcription unavailable",
          detail: data?.error?.message || res.statusText,
        },
      };
    }

    const text = String(data.text ?? "").trim();
    return { status: 200, body: { text, model } };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      status: aborted ? 504 : 502,
      body: {
        error: aborted ? "Request timed out" : "Transcription unavailable",
        detail: err instanceof Error ? err.message : "Unknown error",
      },
    };
  } finally {
    clearTimeout(timer);
  }
}
