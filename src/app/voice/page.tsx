'use client';

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Msg = { role: "user" | "assistant"; content: string };

// --- Minimal Web Speech API typings (enough for our usage) ---
interface SpeechRecognitionEventResult {
  0: { transcript: string; confidence?: number };
  isFinal: boolean;
}
interface SpeechRecognitionEventMap {
  result: SpeechRecognitionEvent;
  start: Event;
  end: Event;
  error: Event;
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionEventResult;
  };
}
interface SpeechRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: (() => void) | null;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
  abort?(): void;
}
interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    speechSynthesis: SpeechSynthesis;
  }
}

function speak(text: string) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    u.pitch = 1;
    u.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    // ignore TTS errors
  }
}

type Source = { n: number; title: string; url: string };
type ApiResponse = { reply: string; tasks?: unknown[]; sources?: Source[] };

export default function VoiceCopilotPage() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const recRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const Rec =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setSupported(Boolean(Rec));
  }, []);

  function startListening() {
    const Rec =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Rec) return;
    const rec = new Rec();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onstart = () => {
      setListening(true);
      setInterim("");
    };
    rec.onerror = () => {
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
    };
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0]?.transcript ?? "";
        if (!t) continue;
        if (r.isFinal) finalText += t;
        else interimText += t;
      }
      setInterim(interimText);
      if (finalText) {
        setInput((prev) => (prev ? prev + " " : "") + finalText.trim());
      }
    };
    recRef.current = rec;
    rec.start();
  }

  function stopListening() {
    try {
      recRef.current?.stop();
    } catch {
      // ignore
    }
    setListening(false);
  }

  async function send() {
    const text = input.trim();
    if (!text) return;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setInterim("");

    const res = await fetch("/api/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history }),
    });

    if (!res.ok) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Sorry, I had trouble answering. Please try again.",
        },
      ]);
      return;
    }

    const data: ApiResponse = await res.json();
    const reply = data.reply ?? "";
    setMessages((m) => [...m, { role: "assistant", content: reply }]);
    speak(reply);
  }

  return (
    <section className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight">Voice Copilot</h1>
      <p className="text-zinc-600 mt-1">
        Ask your relocation question by voice or text. I’ll speak the answer back to you.
      </p>

      <div className="mt-4 flex items-center gap-2">
        {!supported ? (
          <div className="text-sm text-zinc-600">
            Microphone speech recognition isn’t supported in this browser. You can still type below.
          </div>
        ) : (
          <>
            <Button
              onClick={listening ? stopListening : startListening}
              variant={listening ? "secondary" : "default"}
            >
              {listening ? "Stop" : "🎤 Start"}
            </Button>
            <span className="text-sm text-zinc-600">
              {listening ? "Listening…" : interim ? `Heard: “${interim}”` : ""}
            </span>
          </>
        )}
      </div>

      <div className="mt-4">
        <textarea
          className="w-full border rounded p-3 min-h-[90px]"
          placeholder="Or type your question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="mt-2 flex gap-2">
          <Button onClick={send}>Ask Copilot</Button>
          <Button variant="secondary" onClick={() => window.speechSynthesis.cancel()}>
            🔇 Stop speaking
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded p-3 ${
              m.role === "user" ? "bg-zinc-100" : "bg-white border"
            }`}
          >
            <div className="text-xs text-zinc-500 mb-1">
              {m.role === "user" ? "You" : "Copilot"}
            </div>
            <div className="whitespace-pre-wrap break-words">{m.content}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
