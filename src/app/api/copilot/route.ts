// src/app/api/copilot/route.ts
import { NextResponse, type NextRequest } from "next/server";
import OpenAI, { type ChatCompletionMessageParam } from "openai";
import { createClient } from "@supabase/supabase-js";

const SYSTEM_PROMPT = `
You are the Migrate World Copilot.
Mission: Provide precise, verified guidance for relocation (programs, visas, housing, jobs, essentials).
Rules:
- If you have verified context or official sources, answer concisely and cite links inline like [1], [2].
- If you are not certain, SAY YOU'RE NOT SURE and ask for clarification or state which source is needed.
- Never invent or guess. Prefer official gov/university pages and well-known platforms.
- Use short, step-by-step lists when appropriate.

When your reply implies next steps, append a JSON block **at the very end** in a fenced code block:

\`\`\`json
{"tasks":[
  {"title":"Book biometrics appointment","type":"visa","due_date":null},
  {"title":"Shortlist 3 student housing options","type":"housing","due_date":null}
]}
\`\`\`

- Always use a fenced block exactly as above (start with \`\`\`json, end with \`\`\`).
- Do not include any other fenced blocks in the same reply.
- Keep 3–7 tasks max.
`;

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

type KBChunk = {
  id: number;
  url: string;
  title: string;
  content: string | null;
};

function toTask(x: unknown): Task | null {
  if (!x || typeof x !== "object") return null;
  const obj = x as Record<string, unknown>;
  const title = typeof obj.title === "string" ? obj.title : "";
  const valid = [
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
  ] as const;
  const t = typeof obj.type === "string" ? obj.type : "custom";
  const type: Task["type"] = (valid as readonly string[]).includes(t as string)
    ? (t as Task["type"])
    : "custom";
  const rawDue = obj.due_date;
  const due_date = typeof rawDue === "string" ? rawDue : null;
  if (!title) return null;
  return { title, type, due_date };
}

function extractTasks(reply: string): Task[] {
  try {
    // fenced ```json ... ```
    const fenced = reply.match(/```json([\s\S]*?)```/i);
    let raw = fenced ? fenced[1].trim() : "";
    // fallback: trailing { ... } at end
    if (!raw) {
      const i = reply.lastIndexOf("{");
      if (i !== -1) {
        const tail = reply.slice(i).trim();
        if (tail.endsWith("}")) raw = tail;
      }
    }
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && "tasks" in parsed) {
      const arr = Array.isArray((parsed as { tasks?: unknown }).tasks)
        ? ((parsed as { tasks?: unknown[] }).tasks as unknown[])
        : [];
      return arr.map(toTask).filter((t): t is Task => t !== null);
    }
    return [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    // --- env guards ---
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!OPENAI_API_KEY)
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    if (!SUPABASE_URL || !SUPABASE_ANON)
      return NextResponse.json({ error: "Missing Supabase env" }, { status: 500 });

    // --- body ---
    const body = (await req.json().catch(() => ({}))) as {
      message?: string;
      history?: { role: "user" | "assistant" | "system"; content: string }[];
    };
    const message = body.message;
    const history = body.history ?? [];
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing 'message' string" }, { status: 400 });
    }

    // --- retrieval (text search; embeddings OFF path) ---
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON);
    const q = message.split(/\s+/).slice(0, 4).join("%");
    const { data: matchesRaw } = await sb
      .from("kb_chunks")
      .select("id,url,title,content")
      .or(`content.ilike.%${q}%,title.ilike.%${q}%`)
      .limit(5);
    const matches = (matchesRaw ?? []) as KBChunk[];

    const sourceLines = matches.map((m, i) => `[${i + 1}] ${m.title} — ${m.url}`);
    const contextSnips = matches.map(
      (m, i) => `[${i + 1}] ${(m.content ?? "").slice(0, 800)}`
    );
    const contextBlock =
      (sourceLines.length ? `Sources:\n${sourceLines.join("\n")}\n\n` : "") +
      (contextSnips.length ? `Context:\n${contextSnips.join("\n\n")}` : "");

    // --- chat call ---
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(contextBlock ? [{ role: "system", content: contextBlock }] : []),
      ...history,
      { role: "user", content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      messages,
    });

    const reply = completion.choices?.[0]?.message?.content ?? "";
    const tasks = extractTasks(reply);
    const sources = matches.map((m, i) => ({ n: i + 1, title: m.title, url: m.url }));

    return NextResponse.json({ reply, tasks, sources });
  } catch (err: unknown) {
    // sanitized server-log; no secrets leaked to client
    let status: number | undefined;
    let code: string | undefined;
    let msg = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = err as any;
    if (e && typeof e === "object") {
      status = typeof e.status === "number" ? e.status : undefined;
      code = typeof e.code === "string" ? e.code : undefined;
      msg = typeof e.message === "string" ? e.message.slice(0, 140) : "";
    }
    console.error("copilot error", {
      status,
      code,
      msg,
      keyPrefix: (process.env.OPENAI_API_KEY ?? "").slice(0, 6),
    });
    return NextResponse.json(
      { error: "Copilot is temporarily unavailable. Please try again." },
      { status: 500 }
    );
  }
}
