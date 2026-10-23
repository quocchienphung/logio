"use client";

import { AgentSteering } from "@/components/sites/affectui-agent-steering/AgentSteering";
import type { useAgentSteeringDemo } from "@/components/sites/affectui-agent-steering/useAgentSteeringDemo";
import "@/components/sites/affectui-usage-meter/stage.css";

export type ShowcaseTheme = "light" | "dark";
export type AnnotationTarget = "compose" | "keys" | "plan";
type Demo = ReturnType<typeof useAgentSteeringDemo>;

const ResetIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 3.20455C7.1424 3.20455 3.20455 7.1424 3.20455 12C3.20455 16.8576 7.1424 20.7955 12 20.7955C16.8576 20.7955 20.7955 16.8576 20.7955 12C20.7955 11.4603 21.233 11.0227 21.7727 11.0227C22.3125 11.0227 22.75 11.4603 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C14.1254 1.25 16.1072 1.86735 17.7751 2.93159L19 1.70668C19.173 1.43228 19.4788 1.25 19.8272 1.25C20.367 1.25 20.8045 1.68754 20.8045 2.22727V5.28828C20.8045 6.48198 19.3213 7.02646 18.548 6.12763C16.9364 4.33189 14.6005 3.20455 12 3.20455Z"
      fill="currentColor"
    />
  </svg>
);
const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="5.5" fill="currentColor" />
    <path d="M12 1.8v2.4M12 19.8v2.4M1.8 12h2.4M19.8 12h2.4M4.8 4.8l1.7 1.7M17.5 17.5l1.7 1.7M4.8 19.2l1.7-1.7M17.5 6.5l1.7-1.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M10.5163 2.04296C10.6958 2.27649 10.722 2.59345 10.5832 2.85326C9.99927 3.9469 9.66792 5.19607 9.66792 6.52485C9.66792 10.8367 13.1633 14.3321 17.4751 14.3321C18.8039 14.3321 20.0531 14.0007 21.1467 13.4168C21.4065 13.278 21.7235 13.3042 21.957 13.4837C22.1906 13.6632 22.2974 13.9627 22.2302 14.2495C21.1556 18.8349 17.0409 22.25 12.1269 22.25C6.39589 22.25 1.75 17.6041 1.75 11.8731C1.75 6.95906 5.16505 2.84445 9.7505 1.76979C10.0373 1.70258 10.3368 1.80944 10.5163 2.04296Z"
      fill="currentColor"
    />
  </svg>
);

export interface AgentScreenProps {
  demo: Demo;
  theme: ShowcaseTheme;
  onThemeChange: (theme: ShowcaseTheme) => void;
  onReplay: () => void;
  highlight?: AnnotationTarget | null;
  /** The device version leaves room for the status cluster and carries the stage switches. */
  variant?: "device" | "sheet";
}

/** The affectUI preview stage around the Agent Steering card, as shown on the device or in a sheet. */
export function AgentScreen({ demo, theme, onThemeChange, onReplay, highlight, variant = "device" }: AgentScreenProps) {
  const { run, now, actions, takeOver } = demo;
  return (
    <div className="um-stage agent-screen" data-theme={theme} data-layout="column" data-variant={variant} data-highlight={highlight ?? undefined}>
      <div className="um-stage__look">
        <div
          className="steer-demo"
          onPointerDownCapture={(e) => takeOver(e.nativeEvent.isTrusted)}
          onKeyDownCapture={(e) => takeOver(e.nativeEvent.isTrusted)}
        >
          <AgentSteering
            title="Migrate users table"
            agent="Opus 5.5"
            run={run}
            now={now}
            onQueue={actions.queue}
            onInterrupt={actions.interrupt}
            onRemove={actions.remove}
            onDraftChange={actions.setDraft}
            onPause={actions.pause}
            onResume={actions.resume}
          />
        </div>
      </div>
      {variant === "device" && (
        <div className="um-stage__tools">
          <button type="button" className="um-stage__reset" aria-label="Replay the demo" title="Replay" onClick={onReplay}>
            <ResetIcon />
          </button>
          <div className="um-stage__group" role="radiogroup" aria-label="Preview theme">
            <button type="button" role="radio" aria-checked={theme === "light"} aria-label="Light theme" title="Light" className="um-stage__btn" onClick={() => onThemeChange("light")}>
              <SunIcon />
            </button>
            <button type="button" role="radio" aria-checked={theme === "dark"} aria-label="Dark theme" title="Dark" className="um-stage__btn" onClick={() => onThemeChange("dark")}>
              <MoonIcon />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
