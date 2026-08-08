"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  loadHydroSenseContext,
  localHydroSenseAnswer,
  type HydroSenseContext,
} from "@/lib/ai/assistant-context";
import {
  HYDROSENSE_CLEARED,
  HYDROSENSE_GREETING,
  HYDROSENSE_GREETING_SPEAK,
  isMobileDevice,
  micBlockedMessage,
  recentChatForApi,
} from "@/lib/ai/voice";
import { useHydroSenseVoice } from "@/hooks/useHydroSenseVoice";

const PROMPTS = [
  {
    label: "Now",
    hint: "Live weather",
    text: "What are the current weather conditions at the station?",
  },
  {
    label: "Rain",
    hint: "Precipitation",
    text: "What is the rainfall and precipitation status right now?",
  },
  {
    label: "Dams",
    hint: "Network status",
    text: "Give a brief overview of dam storage and any spill alerts.",
  },
  {
    label: "Brief",
    hint: "Executive summary",
    text: "Prepare a concise operational briefing for weather and water levels.",
  },
];

type ChatMessage = {
  role: "user" | "assistant";
  title: string;
  body: string;
  at: number;
};

function assistantMessage(body: string): ChatMessage {
  return {
    role: "assistant",
    title: "HydroSense AI",
    body,
    at: Date.now(),
  };
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TypingIndicator() {
  return (
    <div className="hs-typing" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
        fill="currentColor"
      />
      <path
        d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-3.08A7 7 0 0 0 19 11Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SpeakerIcon({ off }: { off?: boolean }) {
  if (off) {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" />
        <path
          d="m16 9 4 4m0-4-4 4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" />
      <path
        d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

type Props = {
  speakGreetingOnOpen?: boolean;
};

export function HydroSenseChatCore({ speakGreetingOnOpen = false }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    assistantMessage(HYDROSENSE_GREETING),
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const greetedRef = useRef(false);
  const micPressRef = useRef(0);
  const contextRef = useRef<HydroSenseContext | null>(null);

  const {
    support,
    voiceEnabled,
    setVoiceEnabled,
    listening,
    recording,
    speaking,
    voiceError,
    setVoiceError,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    voiceRef,
    micPermission,
  } = useHydroSenseVoice();

  useEffect(() => {
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  useEffect(() => {
    void loadHydroSenseContext().then((ctx) => {
      contextRef.current = ctx;
    });
  }, []);

  useEffect(() => {
    if (!speakGreetingOnOpen || greetedRef.current || !voiceEnabled || !support.tts)
      return;
    greetedRef.current = true;
    const t = window.setTimeout(() => speak(HYDROSENSE_GREETING_SPEAK), 400);
    return () => window.clearTimeout(t);
  }, [speakGreetingOnOpen, voiceEnabled, support.tts, speak]);

  const deliverAnswer = useCallback(
    (body: string) => {
      setMessages((m) => [...m, assistantMessage(body)]);
      if (voiceRef.current?.voiceEnabled) {
        voiceRef.current.speak(body);
      }
    },
    [voiceRef]
  );

  const clearChat = useCallback(() => {
    stopSpeaking();
    stopListening();
    setMessages([assistantMessage(HYDROSENSE_CLEARED)]);
    setInput("");
    setVoiceError(null);
  }, [stopListening, stopSpeaking, setVoiceError]);

  const submit = useCallback(
    async (raw: string) => {
      const prompt = String(raw ?? "").trim();
      if (!prompt || busy) return;

      stopSpeaking();
      stopListening();

      const priorMessages = recentChatForApi(messages);

      setMessages((m) => [
        ...m,
        { role: "user", title: "You", body: prompt, at: Date.now() },
      ]);
      setInput("");
      setBusy(true);

      let requestContext = contextRef.current;
      try {
        requestContext = await loadHydroSenseContext();
        contextRef.current = requestContext;
      } catch {
        requestContext =
          contextRef.current || { llmBlock: "No live dashboard data was supplied." };
      }

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            context: requestContext,
            messages: priorMessages,
          }),
        });

        const data = (await res.json().catch(() => ({}))) as {
          answer?: string;
          text?: string;
        };

        if (res.ok && (data.answer || data.text)) {
          deliverAnswer(data.answer || data.text || "");
          return;
        }

        deliverAnswer(localHydroSenseAnswer(prompt, requestContext));
      } catch {
        deliverAnswer(localHydroSenseAnswer(prompt, requestContext));
      } finally {
        setBusy(false);
      }
    },
    [busy, messages, deliverAnswer, stopListening, stopSpeaking]
  );

  const toggleMic = useCallback(async () => {
    if (listening || recording) {
      if (recording) {
        await startListening({
          onInterim: (draft) => setInput(draft),
          onFinal: (text) => {
            setInput(text);
            void submit(text);
          },
        });
      } else {
        stopListening();
      }
      return;
    }
    if (busy) return;
    await startListening({
      onInterim: (draft) => setInput(draft),
      onFinal: (text) => {
        setInput(text);
        void submit(text);
      },
    });
  }, [listening, recording, busy, startListening, stopListening, submit]);

  const handleMicPress = useCallback(() => {
    const now = Date.now();
    if (now - micPressRef.current < 350) return;
    micPressRef.current = now;
    void toggleMic();
  }, [toggleMic]);

  const showMic = support.micClickable !== false || support.stt || isMobileDevice();
  const httpsRequired = !support.secure && showMic;

  const onFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit(input);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit(input);
    }
  };

  return (
    <div className="hs-chat-core">
      <div className="hs-chat-shell">
        <div className="hs-thread" aria-live="polite" ref={threadRef}>
          {messages.map((msg, idx) => (
            <article
              key={`msg-${idx}-${msg.at}`}
              className={`hs-msg ${msg.role}${
                idx === 0 && msg.role === "assistant" ? " hs-msg--welcome" : ""
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="hs-avatar" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                    <path
                      d="M12 3l1.2 3.6L17 8l-3.8 1.4L12 13l-1.2-3.6L7 8l3.8-1.4L12 3Z"
                      fill="currentColor"
                    />
                    <circle
                      cx="12"
                      cy="16"
                      r="4"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                  </svg>
                </div>
              ) : null}
              <div className="hs-msg-body">
                <div className="hs-bubble">
                  <div className="hs-msg-meta">
                    <b>{msg.title}</b>
                    <time dateTime={new Date(msg.at).toISOString()}>
                      {formatTime(msg.at)}
                    </time>
                  </div>
                  <p>{msg.body}</p>
                </div>
              </div>
            </article>
          ))}
          {busy ? (
            <article className="hs-msg assistant">
              <div className="hs-avatar" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                  <path
                    d="M12 3l1.2 3.6L17 8l-3.8 1.4L12 13l-1.2-3.6L7 8l3.8-1.4L12 3Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div className="hs-msg-body">
                <div className="hs-bubble hs-bubble--typing">
                  <b>HydroSense AI</b>
                  <TypingIndicator />
                </div>
              </div>
            </article>
          ) : null}
        </div>

        <div className="hs-prompts" aria-label="Suggested prompts">
          {PROMPTS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => void submit(p.text)}
              disabled={busy || listening}
            >
              <span className="hs-prompt-copy">
                <span>{p.label}</span>
                <small>{p.hint}</small>
              </span>
            </button>
          ))}
        </div>

        {httpsRequired ? (
          <div className="hs-voice-status hs-voice-status--error" role="alert">
            {micBlockedMessage(false)}
          </div>
        ) : null}
        {micPermission === "prompt" &&
        support.secure &&
        !listening &&
        !recording ? (
          <div className="hs-voice-status hs-voice-status--speak" role="status">
            Tap the microphone — your browser will ask to allow access.
          </div>
        ) : null}
        {listening || recording || speaking || voiceError ? (
          <div className="hs-voice-banner" role="status">
            {listening || recording ? (
              <div
                className={`hs-voice-status hs-voice-status--listen${
                  recording ? " is-recording" : ""
                }`}
              >
                <span className="hs-voice-pulse" aria-hidden="true" />
                {recording ? "Recording… tap mic to send" : "Listening…"}
              </div>
            ) : null}
            {speaking ? (
              <div className="hs-voice-status hs-voice-status--speak">
                Speaking
                <button
                  type="button"
                  className="hs-voice-stop"
                  onClick={stopSpeaking}
                >
                  Stop
                </button>
              </div>
            ) : null}
            {voiceError ? (
              <div
                className="hs-voice-status hs-voice-status--error"
                role="alert"
              >
                {voiceError}
              </div>
            ) : null}
          </div>
        ) : null}

        <form className="hs-compose" onSubmit={onFormSubmit}>
          <div className="hs-compose-field">
            <label className="sr-only" htmlFor="hydrosensePanelInput">
              Ask HydroSense AI
            </label>
            <textarea
              id="hydrosensePanelInput"
              maxLength={700}
              rows={2}
              placeholder={
                listening || recording
                  ? recording
                    ? "Recording… tap mic when done"
                    : "Listening…"
                  : "Ask about temperature, rain, or dam storage…"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={busy}
            />
          </div>
          <div className="hs-compose-toolbar">
            <div className="hs-compose-toolbar-left">
              {showMic ? (
                <>
                  <button
                    type="button"
                    className={`hs-compose-icon hs-compose-mic${
                      listening || recording ? " is-active" : ""
                    }${!support.secure ? " is-blocked" : ""}`}
                    aria-label={
                      listening || recording
                        ? "Stop and send voice"
                        : "Ask with voice"
                    }
                    aria-pressed={listening || recording}
                    title={
                      !support.secure
                        ? "Requires HTTPS"
                        : recording
                          ? "Tap to finish recording"
                          : "Tap to speak"
                    }
                    disabled={busy}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      handleMicPress();
                    }}
                    onClick={(e) => {
                      if (isMobileDevice()) return;
                      e.preventDefault();
                      handleMicPress();
                    }}
                  >
                    <MicIcon />
                  </button>
                  {support.tts ? (
                    <button
                      type="button"
                      className={`hs-compose-icon hs-compose-speaker${
                        voiceEnabled ? " is-on" : ""
                      }`}
                      aria-label={
                        voiceEnabled
                          ? "Turn spoken replies off"
                          : "Turn spoken replies on"
                      }
                      aria-pressed={voiceEnabled}
                      title="Spoken replies"
                      onClick={() => setVoiceEnabled(!voiceEnabled)}
                    >
                      <SpeakerIcon off={!voiceEnabled} />
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
            <div className="hs-compose-toolbar-right">
              <button
                type="button"
                className="hs-compose-ghost"
                onClick={clearChat}
                disabled={busy}
              >
                Clear
              </button>
              <button
                type="submit"
                className="hs-compose-send"
                disabled={busy || listening || recording || !input.trim()}
              >
                <span>Send</span>
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  aria-hidden="true"
                >
                  <path
                    d="M5 12h12m0 0-4-4m4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
