"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Moon, RotateCcw, Sun } from "lucide-react";
import { ContextWindow } from "./ContextWindow";
import "./skilled.css";

export function SkilledPage() {
  const [dark, setDark] = useState(false);
  const [epoch, setEpoch] = useState(0);
  return <main className="skilled-page" data-theme={dark ? "dark" : "light"}>
    <header className="skilled-header">
      <Link className="skilled-back" href="/personalize?browse=1&group=skilled"><ArrowLeft size={16} />Explore pages</Link>
      <h1>Skilled</h1>
      <div className="skilled-controls"><button type="button" aria-label="Reset preview" title="Reset preview" onClick={() => setEpoch(value => value + 1)}><RotateCcw size={16} /></button><button type="button" aria-label={dark ? "Use light theme" : "Use dark theme"} title={dark ? "Use light theme" : "Use dark theme"} onClick={() => setDark(value => !value)}>{dark ? <Sun size={16} /> : <Moon size={16} />}</button></div>
    </header>
    <section className="skilled-stage" aria-label="Context window preview"><ContextWindow key={epoch} autoPlay /></section>
  </main>;
}
