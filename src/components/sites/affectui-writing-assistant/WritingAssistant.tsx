"use client";

import { useId, useLayoutEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import { defaultContent, sampleWriter, visibleText, type Respond, type WritingAssistantContent } from "./writing-assistant-model";
import { useWritingAssistant, type SpeechMode } from "./useWritingAssistant";
import "../affectui-fonts.css";
import "./writing-assistant.css";

export type WritingAssistantProps = Partial<WritingAssistantContent> & {
  /** Answers a message. Defaults to the built-in sample writer; throw or reject to show the error line. */
  respond?: Respond;
  /** `auto` uses the browser's speech recognition when it exists; `simulate` always plays the sample take. */
  speech?: SpeechMode;
  className?: string;
};

const defaultRespond: Respond = message => sampleWriter(message);
const coarsePointer = () => window.matchMedia("(pointer: coarse)").matches;

/**
 * Chat card with a soft gradient glow, suggestions, streaming replies and live voice dictation. It fills its parent
 * and scales as one piece (a 300px-wide design), so the same card reads right in a small frame or a full column.
 */
export function WritingAssistant({
  name = defaultContent.name,
  tagline = defaultContent.tagline,
  greeting = defaultContent.greeting,
  placeholder = defaultContent.placeholder,
  suggestions = defaultContent.suggestions,
  dictation = defaultContent.dictation,
  respond = defaultRespond,
  speech = "auto",
  className,
}: WritingAssistantProps) {
  const { chat, draft, setDraft, listening, notice, busy, send, reset, startDictation, stopDictation } = useWritingAssistant({ respond, speech, dictation });
  const gradient = `wra-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const field = useRef<HTMLTextAreaElement>(null);
  const messages = useRef<HTMLDivElement>(null);
  const inChat = chat.messages.length > 0;

  // The field grows with its text; the stylesheet caps it at four lines and scrolls beyond that.
  useLayoutEffect(() => {
    const element = field.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [draft, listening, inChat]);

  useLayoutEffect(() => {
    const list = messages.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [chat.messages]);

  function submit(text: string) {
    if (send(text) && !coarsePointer()) field.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    submit(draft);
  }

  const last = chat.messages[chat.messages.length - 1];
  const announcement = !last || last.role !== "assistant" ? ""
    : last.status === "writing" ? "Writing…"
    : last.status === "error" ? "Couldn’t write that. Try again."
    : last.status === "done" ? visibleText(last) : "";
  const canSend = draft.trim().length > 0 && !busy;

  return <div className={className ? `wra-frame ${className}` : "wra-frame"}>
    <section className="wra" role="group" aria-label={name} data-chat={inChat ? "" : undefined}>
      <header className="wra__head">
        <div className="wra__id">
          <h3 className="wra__name">
            <svg className="wra__mark" viewBox="0 0 16 16" aria-hidden="true">
              <defs>
                <linearGradient id={gradient} x1="2" y1="2" x2="14" y2="14" gradientUnits="userSpaceOnUse">
                  <stop stopColor="var(--wra-pink)" /><stop offset="0.5" stopColor="var(--wra-violet)" /><stop offset="1" stopColor="var(--wra-blue)" />
                </linearGradient>
              </defs>
              <path fill={`url(#${gradient})`} d="M8 1.5c.3 2.9 1.6 4.2 4.5 4.5-2.9.3-4.2 1.6-4.5 4.5-.3-2.9-1.6-4.2-4.5-4.5 2.9-.3 4.2-1.6 4.5-4.5Z" />
              <path fill={`url(#${gradient})`} d="M12.25 10c.13 1.3.7 1.87 2 2-1.3.13-1.87.7-2 2-.13-1.3-.7-1.87-2-2 1.3-.13 1.87-.7 2-2Z" />
            </svg>
            {name}
          </h3>
          <p className="wra__tagline">{tagline}</p>
        </div>
        <button type="button" className="wra__new" aria-label="New chat" disabled={!inChat} onClick={() => { reset(); if (!coarsePointer()) field.current?.focus(); }}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </header>
      <div className="wra__body">
        <div className="wra__glow" aria-hidden="true">
          <span className="wra__blob wra__blob--pink" /><span className="wra__blob wra__blob--violet" /><span className="wra__blob wra__blob--blue" />
        </div>
        <div className="wra__content">
          {inChat ? <div className="wra__messages" ref={messages}>
            {chat.messages.map(message => message.role === "user"
              ? <p className="wra__msg wra__msg--user" key={message.id}>{message.text}</p>
              : message.status === "writing"
                ? <p className="wra__msg wra__msg--assistant wra__typing" key={message.id}><span className="wra__shimmer" data-text="Writing…" aria-hidden="true">Writing…</span></p>
                : message.status === "error"
                  ? <p className="wra__msg wra__msg--assistant wra__typing" key={message.id}>Couldn’t write that – try again.</p>
                  : <p className="wra__msg wra__msg--assistant" key={message.id}>{visibleText(message)}</p>)}
          </div> : <div className="wra__welcome">
            <p className="wra__greeting">{greeting}</p>
            <div className="wra__chips">
              {suggestions.map(suggestion => <button type="button" className="wra__chip" key={suggestion} onClick={() => submit(suggestion)}>{suggestion}</button>)}
            </div>
          </div>}
        </div>
        <form className="wra__row" onSubmit={event => { event.preventDefault(); submit(draft); }}>
          <div className="wra__field" data-listening={listening ? "" : undefined}>
            <textarea
              ref={field}
              rows={1}
              value={draft}
              readOnly={listening}
              placeholder={listening ? "Listening…" : notice || placeholder}
              aria-label="Message"
              enterKeyHint="send"
              onChange={event => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
            />
          </div>
          <button
            type="button"
            className="wra__mic"
            aria-pressed={listening}
            aria-label={listening ? "Stop dictation" : "Dictate"}
            data-listening={listening ? "" : undefined}
            disabled={busy}
            onClick={listening ? stopDictation : startDictation}
          >
            <span className="wra__pulse" aria-hidden="true" />
            {listening
              ? <span className="wra__wave" aria-hidden="true"><i /><i /><i /></span>
              : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0v-5a3 3 0 0 1 3-3ZM6 11.5a6 6 0 0 0 12 0M12 17.5v3" /></svg>}
          </button>
          {draft.length > 0 && !listening && <button type="submit" className="wra__send" aria-label="Send" disabled={!canSend}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5.5M6 11c0 0 4.4-6 6-6s6 6 6 6" /></svg>
          </button>}
        </form>
      </div>
      <p className="wra__sr" role="status" aria-live="polite">{announcement || notice}</p>
    </section>
  </div>;
}
