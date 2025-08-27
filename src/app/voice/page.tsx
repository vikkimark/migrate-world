// src/app/voice/page.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from "react";

type Role = "user" | "assistant";
type Msg = { role: Role; content: string };
type Source = { n: number; title: string; url: string };
type Task = { title: string; type: string; due_date: string | null };
type CopilotResponse = { reply: string; tasks?: Task[]; sources?: Source[]; error?: string };

export default function VoicePage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! Ask me anything about moving to Canada (programs, visas, housing, jobs, essentials)." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastSources, setLastSources] = useState<Source[]>([]);
  const [recording, setRecording] = useState(false);

  // Optional: basic speech synthesis for assistant replies
  const speak = useCallback((text: string) => {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;
    const utter = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.cancel(); // stop anything playing
    window.speechSynthesis.speak(utter);
  }, []);

  // Optional: basic speech recognition (webkitSpeechRecognition)
  const recRef = useRef<SpeechRecognition | null>(null);
  const startRecording = useCallback(() => {
    if (typeof window === "undefined") return;
    const anyWin = window as unknown as {
      webkitSpeechRecognition?: new () => SpeechRecognition;
      SpeechRecognition?: new () => SpeechRecognition;
    };
    const Ctor = anyWin.SpeechRecognition || anyWin.webkitSpeechRecognition;
    if (!Ctor) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results?.[0]?.[0]?.transcript ?? "";
      if (transcript) {
        setInput(transcript);
        void handleSend(transcript); // auto-send
      }
    };
    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);
    recRef.current = rec;
    setRecording(true);
    rec.start();
  }, []);
  const stopRecording = useCallback(() => {
    recRef.current?.stop();
    setRecording(false);
  }, []);

  const handleSend = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    // clear old sources for the next answer
    setLastSources([]);
    setLoading(true);
    setMessages((m) => [...m, { role: "user", content }]);
    setInput("");

    try {
      const history = messages.slice(-6); // keep it light
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, history }),
      });

      if (!res.ok) {
        let msg = "Copilot error";
        try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
        setMessages((m) => [...m, { role: "assistant", content: msg }]);
        setLoading(false);
        return;
      }

      const data = (await res.json()) as CopilotResponse;
      const reply = data.reply || "…";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      setLastSources(Array.isArray(data.sources) ? data.sources : []);

      // (optional) speak the answer
      speak(reply);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Network error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, speak]);

  useEffect(() => {
    return () => {
      // stop any TTS on unmount
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      // stop recognition on unmount
      recRef.current?.stop();
    };
  }, []);

  return (
    <section className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-semibold tracking-tight">Copilot (voice)</h1>
      <p className="text-zinc-600 mt-1">Ask with text, or tap Speak and talk.</p>

      <div className="mt-4 space-y-3 border rounded p-3 bg-white">
        {messages.map((m, idx) => (
          <div key={idx} className={m.role === "user" ? "text-right" : "text-left"}>
            <div
              className={
                "inline-block whitespace-pre-wrap rounded px-3 py-2 " +
                (m.role === "user" ? "bg-zinc-900 text-white" : "bg-zinc-100")
              }
            >
              {m.content}
            </div>

            {/* Show sources under the LAST assistant message only */}
            {idx === messages.length - 1 && m.role === "assistant" && lastSources.length > 0 && (
              <div className="mt-2 text-xs text-zinc-600">
                <span className="mr-2">Sources:</span>
                {lastSources.map((s) => (
                  <a
                    key={s.n}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={s.title}
                    className="underline mr-2"
                  >
                    [{s.n}]
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder="Type your question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleSend();
          }}
        />
        <button
          className="border rounded px-3 py-2"
          onClick={() => void handleSend()}
          disabled={loading}
          aria-label="Send"
        >
          {loading ? "…" : "Send"}
        </button>
        {!recording ? (
          <button className="border rounded px-3 py-2" onClick={startRecording} aria-label="Speak">
            🎤 Speak
          </button>
        ) : (
          <button className="border rounded px-3 py-2" onClick={stopRecording} aria-label="Stop">
            ⏹️ Stop
          </button>
        )}
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        Tip: ask about anything you’ve ingested on the Admin Ingest page to see citations.
      </p>
    </section>
  );
}
