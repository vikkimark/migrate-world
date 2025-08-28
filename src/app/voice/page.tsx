/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Mic, Volume2, Square } from 'lucide-react';
import { posthog } from '@/lib/analytics';
import type { ReactNode } from "react";

// ----- Types -----
type Source = { n: number; title: string; url: string };
type Msg = { role: 'user' | 'assistant'; content: string; sources?: Source[] };

// Strip fenced ```json ... ``` block from the model text (we still parse tasks server-side)
function stripTasksBlock(text: string): string {
  return text.replace(/```json[\s\S]*?```/gi, '').trim();
}

// Turn any http(s):// links inside plain text into clickable <a> tags
function linkify(
  text: string,
  onClick: (url: string, origin: 'inline') => void
): ReactNode[] {
  const parts: ReactNode[] = [];
  const urlRegex = /(https?:\/\/[^\s)]+)(?=\)|\s|$)/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(text)) !== null) {
    const [url] = match;
    const start = match.index;
    if (start > lastIndex) parts.push(text.slice(lastIndex, start));
    parts.push(
      <a
        key={`${url}-${start}`}
        href={url}
        target="_blank"
        rel="nofollow noopener noreferrer"
        className="underline"
        onClick={() => onClick(url, 'inline')}
      >
        {url}
      </a>
    );
    lastIndex = start + url.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export default function VoicePage() {
  // UI state
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]); // no duplicate greeting

  // --- Text-to-speech (TTS) ---
  const [speaking, setSpeaking] = useState(false);
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const stopSpeaking = useCallback(() => {
    try {
      window.speechSynthesis?.cancel();
    } catch {}
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!canSpeak || !text) return;
      try {
        stopSpeaking();
        const utter = new SpeechSynthesisUtterance(text);
        utter.onend = () => setSpeaking(false);
        utter.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(utter);
        setSpeaking(true);
      } catch {
        setSpeaking(false);
      }
    },
    [canSpeak, stopSpeaking]
  );

  // --- Optional mic (webkitSpeechRecognition) ---
  const recRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  const micSupported =
    typeof window !== 'undefined' &&
    ((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition);

  const startMic = useCallback(() => {
    if (!micSupported) return;
    const AnyWin = window as any;
    const SR = AnyWin.webkitSpeechRecognition || AnyWin.SpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev: any) => {
      const text = ev?.results?.[0]?.[0]?.transcript || '';
      if (text) setInput(prev => (prev ? prev + ' ' + text : text));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }, [micSupported]);

  const stopMic = useCallback(() => {
    try {
      recRef.current?.stop?.();
    } catch {}
    setListening(false);
  }, []);

  // --- Send to API ---
  const sendMessage = useCallback(async () => {
    const message = input.trim();
    if (!message || sending) return;

    setSending(true);
    setMessages(m => [...m, { role: 'user', content: message }]);
    setInput('');

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) {
        const raw = await res.text().catch(() => '');
        let msg = raw;
        try {
          const j = JSON.parse(raw);
          if (j?.error) msg = j.error;
        } catch {}
        throw new Error(msg || 'Unknown error');
      }

      const data: { reply: string; tasks?: unknown[]; sources?: Source[] } = await res.json();
      const visibleReply = stripTasksBlock(data.reply || '');
      const sources = Array.isArray(data.sources) ? data.sources : [];

      setMessages(m => [...m, { role: 'assistant', content: visibleReply, sources }]);

      // auto-speak latest answer
      speak(visibleReply);
    } catch (e) {
      const msg = (e as Error)?.message || 'Copilot failed';
      setMessages(m => [...m, { role: 'assistant', content: `Sorry — ${msg}` }]);
    } finally {
      setSending(false);
    }
  }, [input, sending, speak]);

  // Enter to submit (not Shift+Enter)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        const el = document.activeElement as HTMLElement | null;
        const isTyping =
          el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.getAttribute('contenteditable') === 'true';
        if (isTyping) {
          e.preventDefault();
          (document.getElementById('voice-send-btn') as HTMLButtonElement | null)?.click();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Track clicks
  const onSourceClick = useCallback((s: Source, origin: 'list' | 'inline') => {
    try {
      posthog.capture('copilot_source_click', {
        n: s.n,
        url: s.url,
        title: s.title,
        page: 'voice',
        origin,
      });
    } catch {}
  }, []);

  const onInlineClick = useCallback((url: string, origin: 'inline') => {
    try {
      posthog.capture('copilot_source_click', {
        n: null,
        url,
        title: null,
        page: 'voice',
        origin,
      });
    } catch {}
  }, []);

  return (
    <section className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Voice Copilot</h1>
      <p className="text-zinc-600 mt-1">
        Ask a question and I’ll answer. Click <span className="font-medium">Sources</span> to open official pages.
        {canSpeak ? ' Audio playback will read the reply aloud.' : ' (Speech playback not supported by this browser.)'}
      </p>

      <div className="mt-6 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <div
              className={`inline-block rounded px-4 py-3 max-w-full ${
                m.role === 'user' ? 'bg-black text-white' : 'bg-zinc-100'
              }`}
            >
              <div className="whitespace-pre-wrap break-words">
                {/* Render text with inline linkification */}
                {m.role === 'assistant'
                  ? linkify(m.content, (url) => onInlineClick(url, 'inline'))
                  : m.content}
              </div>

              {/* Dedicated Sources list from API (clickable + tracked) */}
              {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                <div className="mt-2 text-sm text-zinc-700">
                  <div className="font-medium mb-1">Sources</div>
                  <ul className="list-disc ml-5 space-y-1">
                    {m.sources.map((s) => (
                      <li key={s.n}>
                        <a
                          className="underline"
                          href={s.url}
                          target="_blank"
                          rel="nofollow noopener noreferrer"
                          onClick={() => onSourceClick(s, 'list')}
                        >
                          [{s.n}] {s.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <form
        className="mt-6 flex flex-wrap gap-2 items-stretch"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g., Canada study permit steps — cite sources"
          className="flex-1 border rounded px-3 py-2 min-w-[200px]"
          aria-label="Type your question"
        />

        <button
          id="voice-send-btn"
          type="submit"
          disabled={sending || !input.trim()}
          className="border rounded px-3 py-2 flex items-center gap-2"
          title="Ask"
          aria-label="Ask"
        >
          <Send size={16} />
          {sending ? 'Sending…' : 'Ask'}
        </button>

        <button
          type="button"
          onClick={() => {
            const last = [...messages].reverse().find(m => m.role === 'assistant');
            speak(stripTasksBlock(last?.content || ''));
          }}
          disabled={!canSpeak || speaking}
          className="border rounded px-3 py-2 flex items-center gap-2"
          title="Speak latest reply"
          aria-label="Speak latest reply"
        >
          <Volume2 size={16} />
          Speak
        </button>

        <button
          type="button"
          onClick={stopSpeaking}
          disabled={!canSpeak || !speaking}
          className="border rounded px-3 py-2 flex items-center gap-2"
          title="Stop speaking"
          aria-label="Stop speaking"
        >
          <Square size={16} />
          Stop
        </button>

        <button
          type="button"
          onClick={listening ? stopMic : startMic}
          disabled={!micSupported}
          className="border rounded px-3 py-2 flex items-center gap-2"
          title={micSupported ? (listening ? 'Stop mic' : 'Start mic') : 'Mic not supported in this browser'}
          aria-label="Toggle microphone"
        >
          <Mic size={16} />
          {listening ? 'Listening…' : 'Mic'}
        </button>
      </form>
    </section>
  );
}
