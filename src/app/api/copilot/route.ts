// src/app/api/copilot/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Role = "system" | "user" | "assistant";
type ChatMsg = { role: Role; content: string };
type Task = {
  title: string;
  type:
    | "visa"
    | "housing"
    | "program"
    | "job"
    | "shop"
    | "flight"
    | "travel"
    | "health"
    | "education"
    | "custom";
  due_date: string | null;
};
type KBChunk = { id: number; title: string; url: string; content: string };
type Source = { n: number; title: string; url: string };

const SYSTEM_PROMPT = `
You are the Migrate World Copilot.
Mission: Provide precise, verified guidance for relocation (programs, visas, housing, jobs, essentials).
Rules:
- Cite official or trusted sources inline when relevant.
- If not certain, say you're not sure and ask for the needed detail.
- Use concise step-by-step lists when helpful.
- At the very end, append a JSON task block in a single fenced code block:

\`\`\`json
{"tasks":[
  {"title":"Book biometrics appointment","type":"visa","due_date":null},
  {"title":"Shortlist 3 student housing options","type":"housing","due_date":null}
]}
\`\`\`

Keep 3–7 tasks max; one fenced block only.
`.trim();

function extractTasks(reply: string): Task[] {
  const valid: Task["type"][] = [
    "visa",
    "housing",
    "program",
    "job",
    "shop",
    "flight",
    "travel",
    "health",
    "education",
    "custom",
  ];

  const toTask = (x: unknown): Task | null => {
    if (!x || typeof x !== "object") return null;
    const o = x as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title : "";
    const typeStr = typeof o.type === "string" ? o.type : "custom";
    const type = (valid as readonly string[]).includes(typeStr)
      ? (typeStr as Task["type"])
      : "custom";
    const rawDue = o.due_date;
    const due_date = typeof rawDue === "string" ? rawDue : null;
    return title ? { title, type, due_date } : null;
  };

  try {
    // Try fenced ```json ... ```
    const fenced = reply.match(/```json([\s\S]*?)```/i);
    let raw = fenced ? fenced[1].trim() : "";

    // Fallback: trailing {...} at end of reply
    if (!raw) {
      const lastBrace = reply.lastIndexOf("{");
      if (lastBrace !== -1) {
        const candidate = reply.slice(lastBrace).trim();
        if (candidate.endsWith("}")) raw = candidate;
      }
    }
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    const arr =
      parsed &&
      typeof parsed === "object" &&
      "tasks" in (parsed as Record<string, unknown>)
        ? (parsed as { tasks?: unknown[] }).tasks
        : [];
    if (!Array.isArray(arr)) return [];
    return arr.map(toTask).filter((t): t is Task => t !== null);
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  // Env checks
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY" },
      { status: 500 }
    );
  }
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE;
  if (!SB_URL || !SB_ANON || !SB_SERVICE) {
    return NextResponse.json(
      { error: "Missing Supabase env" },
      { status: 500 }
    );
  }

  // Server-side Supabase (service role; bypasses RLS in this API route)
  const sb = createClient(SB_URL, SB_SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Input
  const body = await req.json().catch(() => ({} as unknown));
  const { message, history = [] as ChatMsg[] } = (body ?? {}) as {
    message?: string;
    history?: ChatMsg[];
  };
  if (!message || typeof message !== "string") {
    return NextResponse.json(
      { error: "Missing 'message' string" },
      { status: 400 }
    );
  }

  // Simple text search over kb_chunks (works without embeddings)
  let matches: KBChunk[] = [];
  try {
    const q = message.split(/\s+/).slice(0, 5).join("%");
    const { data, error } = await sb
      .from("kb_chunks")
      .select("id,title,url,content")
      .or(`content.ilike.%${q}%,title.ilike.%${q}%`)
      .limit(8);

    if (!error) {
      matches = (data ?? []).filter(
        (m): m is KBChunk =>
          !!m &&
          typeof m.title === "string" &&
          typeof m.url === "string" &&
          typeof m.content === "string"
      );
    }
  } catch {
    matches = [];
  }

  // Optional inline context for the model
  const contextBlock = matches.length
    ? "Context:\n" +
      matches.map((m, i) => `[${i + 1}] ${m.title} — ${m.url}`).join("\n")
    : "";

  // Build chat messages
  const messages: ChatMsg[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(contextBlock ? [{ role: "system", content: contextBlock }] : []),
    ...history,
    { role: "user", content: message },
  ];

  // Call OpenAI via fetch
  let reply = "";
  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages,
      }),
    });

    if (!resp.ok) {
      const raw = await resp.text();
      let msg = raw;
      try {
        const j = JSON.parse(raw) as { error?: { message?: string } };
        if (j?.error?.message) msg = j.error.message;
      } catch {}
      return NextResponse.json({ error: msg || "OpenAI error" }, { status: 502 });
    }

    const data = (await resp.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    reply = data?.choices?.[0]?.message?.content ?? "";
  } catch (e) {
    return NextResponse.json(
      { error: "Copilot is temporarily unavailable. Please try again." },
      { status: 500 }
    );
  }

  // Extract tasks + compact sources
  const tasks = extractTasks(reply);
  const sources: Source[] = matches
    .map((m, i) => ({
      n: i + 1,
      title: (m.title || "").slice(0, 120) || "Source",
      url: m.url || "",
    }))
    .filter((s, idx, arr) => s.url && idx === arr.findIndex((t) => t.url === s.url))
    .slice(0, 5);

  return NextResponse.json({ reply, tasks, sources });
}
