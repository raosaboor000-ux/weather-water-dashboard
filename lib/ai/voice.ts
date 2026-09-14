/** HydroSense voice helpers — STT/TTS support, mic unlock, recent chat. */

export const RECENT_MESSAGE_LIMIT = 5;

export const HYDROSENSE_GREETING =
  "Welcome to HydroSense AI — your weather and water-level analyst.\n\n" +
  "I can help with live station conditions, recent weather history trends, and dam reservoir levels across this dashboard.\n\n" +
  "Type your question or tap the microphone to speak.";

export const HYDROSENSE_GREETING_SPEAK =
  "Welcome to HydroSense AI. Ask me about live weather, recent trends, or dam water levels and storage.";

export const HYDROSENSE_CLEARED =
  "Conversation cleared. Ask about station weather, history trends, or dam water levels — by text or voice.";

export type VoiceSupport = {
  stt: boolean;
  tts: boolean;
  any: boolean;
  secure: boolean;
  mode: "native" | "recorder" | null;
  hasNativeStt: boolean;
  hasMedia: boolean;
  hasRecorder: boolean;
  micClickable: boolean;
};

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
}

export function isSecureMicContext(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext === true;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((ev: Event) => void) | null;
  onend: ((ev: Event) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onresult: ((ev: {
    resultIndex: number;
    results: {
      length: number;
      [i: number]: { isFinal: boolean; [j: number]: { transcript: string } };
    };
  }) => void) | null;
};

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

type LegacyGetUserMedia = (
  constraints: MediaStreamConstraints,
  success: (stream: MediaStream) => void,
  error: (err: Error) => void
) => void;

export function getUserMediaCompat(
  constraints: MediaStreamConstraints
): Promise<MediaStream> {
  if (typeof navigator === "undefined") {
    return Promise.reject(new Error("Microphone is not available."));
  }

  if (navigator.mediaDevices?.getUserMedia) {
    return navigator.mediaDevices.getUserMedia(constraints);
  }

  const nav = navigator as Navigator & {
    getUserMedia?: LegacyGetUserMedia;
    webkitGetUserMedia?: LegacyGetUserMedia;
    mozGetUserMedia?: LegacyGetUserMedia;
    msGetUserMedia?: LegacyGetUserMedia;
  };

  const legacy =
    nav.getUserMedia ||
    nav.webkitGetUserMedia ||
    nav.mozGetUserMedia ||
    nav.msGetUserMedia;

  if (legacy) {
    return new Promise((resolve, reject) => {
      legacy.call(navigator, constraints, resolve, reject);
    });
  }

  return Promise.reject(
    new Error("Microphone API not available in this browser.")
  );
}

export function hasMicrophoneApi(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & {
    getUserMedia?: unknown;
    webkitGetUserMedia?: unknown;
    mozGetUserMedia?: unknown;
  };
  return Boolean(
    navigator.mediaDevices?.getUserMedia ||
      nav.getUserMedia ||
      nav.webkitGetUserMedia ||
      nav.mozGetUserMedia
  );
}

function preferRecorderOnMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS/i.test(ua);
  return (
    isIos ||
    (isMobileDevice() && isSafari && !getSpeechRecognitionCtor())
  );
}

export function voiceAgentSupported(): VoiceSupport {
  if (typeof window === "undefined") {
    return {
      stt: false,
      tts: false,
      any: false,
      secure: false,
      mode: null,
      hasNativeStt: false,
      hasMedia: false,
      hasRecorder: false,
      micClickable: false,
    };
  }

  const secure = isSecureMicContext();
  const tts = typeof window.speechSynthesis !== "undefined";
  const hasMedia = hasMicrophoneApi();
  const hasNativeStt = Boolean(getSpeechRecognitionCtor());
  const hasRecorder = typeof MediaRecorder !== "undefined";
  const mobile = isMobileDevice();

  let mode: VoiceSupport["mode"] = null;
  if (secure && hasMedia) {
    if (hasNativeStt && !preferRecorderOnMobile()) mode = "native";
    else if (hasRecorder || mobile) mode = "recorder";
    else if (hasNativeStt) mode = "native";
  }

  const micClickable = hasMedia || mobile;

  return {
    stt: micClickable,
    tts,
    any: micClickable || tts,
    secure,
    mode,
    hasNativeStt,
    hasMedia,
    hasRecorder,
    micClickable,
  };
}

export function micBlockedMessage(secure: boolean): string | null {
  if (secure) return null;
  return "Microphone needs HTTPS. Open this dashboard over https:// (or localhost).";
}

export function canUseMediaRecorder(): boolean {
  return typeof MediaRecorder !== "undefined";
}

export function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/aac",
    "audio/ogg;codecs=opus",
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const base64 = dataUrl.includes(",")
        ? dataUrl.split(",")[1]
        : dataUrl;
      resolve(base64);
    };
    reader.onerror = () =>
      reject(reader.error || new Error("Could not read audio"));
    reader.readAsDataURL(blob);
  });
}

export async function transcribeAudioBlob(
  blob: Blob,
  mimeType?: string
): Promise<string> {
  const audio = await blobToBase64(blob);
  const res = await fetch("/api/ai/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audio,
      mime: mimeType || blob.type || "audio/webm",
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    text?: string;
    detail?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.detail || data.error || "Transcription failed");
  }
  return String(data.text || "").trim();
}

export type ChatTurn = { role: string; body?: string; content?: string };

export function recentChatForApi(
  messages: ChatTurn[],
  limit = RECENT_MESSAGE_LIMIT
): { role: string; content: string }[] {
  return (messages || [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-limit)
    .map((m) => ({
      role: m.role,
      content: String(m.body ?? m.content ?? "").trim(),
    }))
    .filter((m) => m.content);
}

export function textForSpeech(text: string): string {
  return String(text ?? "")
    .replace(/°C/g, " degrees Celsius")
    .replace(/°F/g, " degrees Fahrenheit")
    .replace(/km\/h/g, " kilometres per hour")
    .replace(/\bft\b/g, " feet")
    .replace(/mm\b/g, " millimetres")
    .replace(/\*\*/g, "")
    .replace(/[_#`]/g, "")
    .replace(/\s*\n+\s*/g, ". ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function pickSpeechVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  const preferred = [
    "Google UK English Female",
    "Microsoft Zira",
    "Microsoft Jenny",
    "Samantha",
    "Daniel",
  ];
  for (const name of preferred) {
    const hit = voices.find((v) => v.name.includes(name));
    if (hit) return hit;
  }
  return (
    voices.find((v) => v.lang.startsWith("en") && !v.localService) ||
    voices.find((v) => v.lang.startsWith("en")) ||
    voices[0] ||
    null
  );
}

export function speechRecognitionLang(): string {
  if (isMobileDevice()) return "en-US";
  return "en-US";
}
