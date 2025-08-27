'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function AdminIngestPage() {
  const [token, setToken] = useState<string>("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<string>("");

  async function submit() {
    setStatus("Submitting…");
    const res = await fetch("/api/admin/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token.trim(),
      },
      body: JSON.stringify({
        title: title.trim(),
        url: url.trim() || undefined,
        content: content.trim() || undefined,
      }),
    });
    if (!res.ok) {
      let msg = "Failed";
      try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
      setStatus(`❌ ${msg}`);
      return;
    }
    const j = await res.json();
    setStatus(`✅ Ingested ${j.chunks} chunks`);
    setContent("");
  }

  return (
    <section className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight">Admin Ingest</h1>
      <p className="text-zinc-600 mt-1">Paste text or a URL to add to the knowledge base.</p>

      <div className="mt-4 space-y-3">
        <div>
          <label className="block text-sm mb-1">Admin token</label>
          <input className="w-full border rounded px-3 py-2" value={token} onChange={(e) => setToken(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Title</label>
          <input className="w-full border rounded px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="IRCC — Study Permit" />
        </div>
        <div>
          <label className="block text-sm mb-1">Source URL (optional if you paste content)</label>
          <input className="w-full border rounded px-3 py-2" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div>
          <label className="block text-sm mb-1">Content (optional if URL provided)</label>
          <textarea className="w-full border rounded px-3 py-2 min-h-[160px]" value={content} onChange={(e) => setContent(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button onClick={submit}>Ingest</Button>
          <div className="text-sm text-zinc-600">{status}</div>
        </div>
      </div>
    </section>
  );
}
