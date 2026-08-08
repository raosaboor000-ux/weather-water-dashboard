"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  canUseMediaRecorder,
  getSpeechRecognitionCtor,
  getUserMediaCompat,
  isMobileDevice,
  micBlockedMessage,
  pickRecorderMimeType,
  pickSpeechVoice,
  speechRecognitionLang,
  textForSpeech,
  transcribeAudioBlob,
  voiceAgentSupported,
  type SpeechRecognitionLike,
  type VoiceSupport,
} from "@/lib/ai/voice";

const VOICE_PREF_KEY = "hydrosense:voice-on";
const MAX_RECORD_MS = 18_000;

type ListenHandlers = {
  onInterim?: (draft: string) => void;
  onFinal?: (text: string) => void;
};

function readVoicePref(): boolean {
  try {
    const v = sessionStorage.getItem(VOICE_PREF_KEY);
    if (v === "0") return false;
    if (v === "1") return true;
  } catch {
    /* ignore */
  }
  return true;
}

function writeVoicePref(on: boolean) {
  try {
    sessionStorage.setItem(VOICE_PREF_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function useHydroSenseVoice() {
  const [support] = useState<VoiceSupport>(() => voiceAgentSupported());
  const [voiceEnabled, setVoiceEnabledState] = useState(readVoicePref);
  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [micPermission, setMicPermission] = useState("unknown");

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const handlersRef = useRef<ListenHandlers | null>(null);
  const voiceRef = useRef<{
    speak: (text: string) => void;
    voiceEnabled: boolean;
    stopSpeaking: () => void;
    stopListening: () => void;
  } | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "microphone" as PermissionName })
        .then((result) => {
          setMicPermission(result.state);
          result.onchange = () => setMicPermission(result.state);
        })
        .catch(() => setMicPermission("unknown"));
    }
  }, []);

  const resolveListenMode = useCallback(
    (current: VoiceSupport = support) => {
      if (current.mode) return current.mode;
      if (!current.secure) return null;
      if (current.hasNativeStt && !isMobileDevice()) return "native";
      if (canUseMediaRecorder()) return "recorder";
      if (current.hasNativeStt) return "native";
      return null;
    },
    [support]
  );

  const setVoiceEnabled = useCallback((on: boolean) => {
    setVoiceEnabledState(on);
    writeVoicePref(on);
    if (!on) {
      window.speechSynthesis?.cancel();
      setSpeaking(false);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!support.tts || !voiceEnabled) return;
      const utter = textForSpeech(text);
      if (!utter) return;

      stopSpeaking();

      const u = new SpeechSynthesisUtterance(utter);
      u.rate = 0.96;
      u.pitch = 1;
      u.volume = 1;
      const voice = pickSpeechVoice();
      if (voice) u.voice = voice;

      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);

      window.speechSynthesis.speak(u);
    },
    [support.tts, voiceEnabled, stopSpeaking]
  );

  const cleanupRecorder = useCallback(() => {
    if (recordTimerRef.current) {
      clearTimeout(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    try {
      recorderRef.current?.stop();
    } catch {
      /* ignore */
    }
    recorderRef.current = null;
    recordStreamRef.current?.getTracks().forEach((t) => t.stop());
    recordStreamRef.current = null;
    recordChunksRef.current = [];
    setRecording(false);
  }, []);

  const stopListening = useCallback(() => {
    submittedRef.current = true;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    setListening(false);
    cleanupRecorder();
  }, [cleanupRecorder]);

  const finishRecorder = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      cleanupRecorder();
      setListening(false);
      return;
    }

    submittedRef.current = true;
    setListening(false);

    await new Promise<void>((resolve) => {
      recorder.addEventListener("stop", () => resolve(), { once: true });
      try {
        recorder.stop();
      } catch {
        resolve();
      }
    });

    const mime = recorder.mimeType || pickRecorderMimeType() || "audio/webm";
    const chunks = recordChunksRef.current.slice();
    cleanupRecorder();

    const blob = new Blob(chunks, { type: mime });
    recordChunksRef.current = [];

    if (blob.size < 400) {
      setVoiceError("No speech detected. Tap mic and try again.");
      return;
    }

    try {
      setVoiceError(null);
      const text = await transcribeAudioBlob(blob, mime);
      if (!text) {
        setVoiceError("Could not understand audio. Please try again.");
        return;
      }
      handlersRef.current?.onInterim?.(text);
      handlersRef.current?.onFinal?.(text);
    } catch (err) {
      setVoiceError(
        err instanceof Error ? err.message : "Transcription failed. Try again."
      );
    }
  }, [cleanupRecorder]);

  const startRecorder = useCallback(
    async (handlers: ListenHandlers) => {
      handlersRef.current = handlers;
      submittedRef.current = false;
      stopSpeaking();
      setVoiceError(null);

      if (!support.secure) {
        setVoiceError(micBlockedMessage(false));
        return;
      }

      const mime = pickRecorderMimeType();
      if (!canUseMediaRecorder()) {
        setVoiceError("Recording is not supported in this browser.");
        return;
      }

      try {
        const stream = await getUserMediaCompat({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        recordStreamRef.current = stream;
        recordChunksRef.current = [];

        const recorder = mime
          ? new MediaRecorder(stream, { mimeType: mime })
          : new MediaRecorder(stream);
        recorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data?.size > 0) recordChunksRef.current.push(e.data);
        };

        recorder.onerror = () => {
          setVoiceError("Recording error. Try again.");
          stopListening();
        };

        recorder.start(250);
        setRecording(true);
        setListening(true);

        recordTimerRef.current = setTimeout(() => {
          void finishRecorder();
        }, MAX_RECORD_MS);
      } catch (err) {
        cleanupRecorder();
        setListening(false);
        const name =
          err && typeof err === "object" && "name" in err
            ? String((err as { name: string }).name)
            : "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setVoiceError(
            "Microphone permission denied. Allow mic in browser settings."
          );
        } else {
          setVoiceError(
            err instanceof Error ? err.message : "Could not start microphone."
          );
        }
      }
    },
    [support.secure, stopSpeaking, stopListening, finishRecorder, cleanupRecorder]
  );

  const startNativeListening = useCallback(
    async (handlers: ListenHandlers) => {
      handlersRef.current = handlers;
      submittedRef.current = false;
      stopSpeaking();
      setVoiceError(null);

      if (!support.secure) {
        setVoiceError(micBlockedMessage(false));
        return;
      }

      const SR = getSpeechRecognitionCtor();
      if (!SR) {
        setVoiceError("Speech recognition is not available in this browser.");
        return;
      }

      try {
        const unlock = await getUserMediaCompat({ audio: true });
        unlock.getTracks().forEach((t) => t.stop());
      } catch (err) {
        setVoiceError(
          err instanceof Error ? err.message : "Microphone permission denied."
        );
        return;
      }

      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }

      const rec = new SR();
      const mobile = isMobileDevice();
      rec.lang = speechRecognitionLang();
      rec.interimResults = true;
      rec.continuous = mobile;
      rec.maxAlternatives = 1;

      rec.onstart = () => setListening(true);
      rec.onend = () => {
        setListening(false);
        recognitionRef.current = null;
      };
      rec.onerror = (e) => {
        setListening(false);
        recognitionRef.current = null;
        if (e.error === "not-allowed") {
          setVoiceError("Microphone permission denied.");
        } else if (e.error === "service-not-allowed") {
          setVoiceError(
            micBlockedMessage(support.secure) ||
              "Voice service blocked. Use HTTPS."
          );
        } else if (e.error === "audio-capture") {
          setVoiceError(
            "No microphone found or mic is in use by another app."
          );
        } else if (e.error !== "aborted" && e.error !== "no-speech") {
          setVoiceError("Could not capture voice. Try again.");
        }
      };

      rec.onresult = (event) => {
        let interim = "";
        let finalText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i]?.[0]?.transcript ?? "";
          if (event.results[i].isFinal) finalText += t;
          else interim += t;
        }
        const draft = (finalText || interim).trim();
        if (draft) handlersRef.current?.onInterim?.(draft);
        if (finalText.trim() && !submittedRef.current) {
          submittedRef.current = true;
          handlersRef.current?.onFinal?.(finalText.trim());
          try {
            rec.stop();
          } catch {
            /* ignore */
          }
        }
      };

      recognitionRef.current = rec;
      try {
        rec.start();
      } catch {
        setVoiceError("Microphone busy. Try again in a moment.");
        setListening(false);
        recognitionRef.current = null;
      }
    },
    [support.secure, stopSpeaking]
  );

  const startListening = useCallback(
    async (handlers: ListenHandlers) => {
      if (listening || recording) {
        if (recording) {
          await finishRecorder();
        } else {
          stopListening();
        }
        return;
      }

      if (!support.stt && !support.micClickable) {
        setVoiceError("Microphone is not available in this browser.");
        return;
      }

      if (!support.secure) {
        setVoiceError(micBlockedMessage(false));
        return;
      }

      const mode = resolveListenMode();
      if (!mode) {
        setVoiceError("Voice input is not supported in this browser.");
        return;
      }

      if (mode === "recorder") {
        await startRecorder(handlers);
        return;
      }

      await startNativeListening(handlers);
    },
    [
      listening,
      recording,
      support,
      stopListening,
      startRecorder,
      startNativeListening,
      finishRecorder,
      resolveListenMode,
    ]
  );

  useEffect(() => {
    if (!support.tts) return undefined;
    function loadVoices() {
      pickSpeechVoice();
    }
    loadVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
      window.speechSynthesis?.cancel();
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
      cleanupRecorder();
    };
  }, [support.tts, cleanupRecorder]);

  useEffect(() => {
    voiceRef.current = { speak, voiceEnabled, stopSpeaking, stopListening };
  }, [speak, voiceEnabled, stopSpeaking, stopListening]);

  return {
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
  };
}
