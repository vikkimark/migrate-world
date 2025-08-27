'use client';

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

function stripJsonTasks(text: string) {
  // remove fenced ```json ... ``` blocks
  let out = text.replace(/```json[\s\S]*?```/gi, "").replace(/```[\s\S]*?```/g, "");
  // also remove a trailing single JSON object if the model appended it without fences
  const lastBrace = out.lastIndexOf("{");
  if (lastBrace !== -1) {
    const tail = out.slice(lastBrace).trim();
    if (tail.startsWith("{") && tail.endsWith("}")) {
      out = out.slice(0, lastBrace);
    }
  }
  return out.trim();
}

function linkify(text: string) {
  const parts = text.split(/(https?:\/\/[^\s)]+)|(\n)/g);
  return parts.map((p, i) => {
    if (!p) return null;
    if (p === "\n") return <br key={i} />;
    if (/^https?:\/\//.test(p)) {
      return (
        <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="underline">
          {p}
        </a>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

type Msg = { role: "user" | "assistant"; content: string };
type Task = {
  title: string;
  type: "visa" | "housing" | "program" | "job" | "shop" | "flight" | "custom";
  due_date: string | null;
};

export default function CopilotPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I’m your relocation copilot. Ask me anything about programs, visas, housing, jobs, or settling in." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    setPendingTasks([]);

    try {
      const res = await fetch("/api/copilot", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: text, history }),
});
if (!res.ok) {
  const raw = await res.text();
  let msg = raw;
  try { const j = JSON.parse(raw); if (j?.error) msg = j.error; } catch {}
  throw new Error(msg || "Unknown error");
}
const data: { reply: string; tasks: Task[] } = await res.json();

      setMessages(prev => [...prev, { role: "assistant", content: data.reply || "(no reply)" }]);
      if (Array.isArray(data.tasks) && data.tasks.length) {
        setPendingTasks(data.tasks);
      }
    } catch (err) {
      console.error(err);
      toast.error(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function addTasksToChecklist(tasks: Task[]) {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      toast.error("Please sign in first.");
      window.location.href = "/signup";
      return;
    }

    const rows = tasks.map(t => ({
      user_id: user.id,
      type: (["visa","housing","program","job","shop","flight","custom"] as const).includes(t.type)
        ? t.type : "custom",
      ref_table: "copilot",
      ref_id: null,
      title: t.title,
      status: "todo",
      due_date: t.due_date ? t.due_date : null,
    }));

    const { error } = await supabase.from("checklist_items").insert(rows);
    if (error) {
      console.error("insert tasks error:", error);
      toast.error("Could not add tasks.");
      return;
    }
    toast.success(`Added ${rows.length} task${rows.length > 1 ? "s" : ""} to your checklist.`);
    const go = confirm("Open checklist now?");
    if (go) window.location.href = "/checklist";
  }

  return (
    <section className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Copilot</h1>
      <p className="mt-2 text-zinc-600">Ask questions and get actionable steps. I’ll suggest tasks you can add to your checklist.</p>

      <div className="mt-6 border rounded p-4 space-y-3">
        <div className="space-y-3 max-h-[50vh] overflow-auto">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              <div className={`inline-block rounded px-3 py-2 ${m.role === "user" ? "bg-black text-white" : "bg-zinc-100"}`}>
	       {linkify(stripJsonTasks(m.content))}
              </div>
            </div>
          ))}
        </div>

        {pendingTasks.length > 0 && (
          <div className="mt-2 border-t pt-3">
            <div className="font-medium">Suggested tasks</div>
            <ul className="mt-2 list-disc pl-5">
              {pendingTasks.map((t, idx) => (
                <li key={idx}>
                  {t.title}
                  {t.due_date ? ` (due ${t.due_date})` : ""}
                  <span className="text-xs text-zinc-500"> — {t.type}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <button
                className="border rounded px-3 py-2"
                onClick={() => addTasksToChecklist(pendingTasks)}
              >
                Add all to checklist
              </button>
            </div>
          </div>
        )}

        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            className="flex-1 border rounded px-3 py-2"
            placeholder="Ask about study permits, program choices, housing near campus…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button className="border rounded px-4 py-2" type="submit" disabled={loading}>
            {loading ? "Thinking…" : "Send"}
          </button>
        </form>
      </div>
      <p className="mt-3 text-xs text-zinc-500">
	We will help you move to start a new country. Always verify on official portals
      </p>
    </section>
  );
}
