"use client";

import { useCallback, useState } from "react";
import { HydroSenseChatPanel } from "@/components/assistant/HydroSenseChatPanel";

export function HydroSenseChatFab() {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => {
    setOpen((v) => !v);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <>
      <HydroSenseChatPanel open={open} onClose={close} />

      <button
        type="button"
        className={`hs-chat-fab${open ? " is-open" : ""}`}
        aria-label={open ? "Close HydroSense AI" : "Open HydroSense AI"}
        aria-expanded={open}
        title="HydroSense AI"
        onClick={toggle}
      >
        {!open ? (
          <>
            <span className="hs-chat-fab-pulse" aria-hidden="true" />
            <span
              className="hs-chat-fab-pulse hs-chat-fab-pulse--delay"
              aria-hidden="true"
            />
          </>
        ) : null}
        <span className="hs-chat-fab-icon" aria-hidden="true">
          {open ? (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
              <path
                d="M7 7l10 10M17 7 7 17"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
              <path
                d="M8 10.5h8M8 14h5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M6.5 18.5 7.8 16H17a2.2 2.2 0 0 0 2.2-2.2V8.2A2.2 2.2 0 0 0 17 6H7A2.2 2.2 0 0 0 4.8 8.2v5.6A2.2 2.2 0 0 0 7 16h.8l-1.3 2.5Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="M16.5 4.5 18 3m0 0 1.5 1.5M18 3v2.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          )}
        </span>
        {!open ? <span className="hs-chat-fab-label">HydroSense</span> : null}
      </button>
    </>
  );
}
