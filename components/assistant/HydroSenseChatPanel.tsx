"use client";

import { useEffect, useRef } from "react";
import { HydroSenseChatCore } from "@/components/assistant/HydroSenseChatCore";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function HydroSenseChatPanel({ open, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <>
      <button
        type="button"
        className={`hs-chat-backdrop${open ? " is-open" : ""}`}
        aria-label="Close chat"
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={`hs-chat-panel${open ? " is-open" : ""}`}
        role="dialog"
        aria-modal={open}
        aria-hidden={!open}
        aria-label="HydroSense AI assistant"
      >
        <header className="hs-chat-panel-head">
          <div className="hs-chat-panel-brand">
            <div className="hs-chat-panel-orb" aria-hidden="true">
              <span />
            </div>
            <div>
              <div className="hs-chat-panel-eyebrow">HydroSense Intelligence</div>
              <h2>Weather &amp; Water AI</h2>
            </div>
          </div>
          <button
            type="button"
            className="hs-chat-panel-close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="hs-chat-panel-body">
          <HydroSenseChatCore speakGreetingOnOpen={open} />
        </div>
      </div>
    </>
  );
}
