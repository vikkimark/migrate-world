import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const SYSTEM_PROMPT = `
You are the Migrate World Copilot.
Mission: Provide precise, verified guidance for relocation (programs, visas, housing, jobs, essentials).
Rules:
- If you have verified context or official sources, answer concisely and cite links inline.
- If you are not certain, SAY YOU'RE NOT SURE and ask for clarification or say which source is needed.
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


export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const { message, history = [] } = body as {
    message?: string;
    history?: { role: "user" | "assistant" | "system"; content: string }[];
  };

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Missing 'message' string" }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: message },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      temperature: 1,
      messages,
    });

  const reply = completion.choices?.[0]?.message?.content ?? "";

 // Try to extract optional JSON tasks block
type Task = {
  title: string;
  // include a few extra types we might see; everything else falls back to 'custom'
  type: 'visa' | 'housing' | 'program' | 'job' | 'shop' | 'flight' | 'travel' | 'health' | 'education' | 'custom';
  due_date: string | null;
};

function toTask(x: unknown): Task | null {
  if (!x || typeof x !== 'object') return null;
  const obj = x as Record<string, unknown>;

  const title = typeof obj.title === 'string' ? obj.title : '';
  const typeCandidate = typeof obj.type === 'string' ? obj.type : '';
  const validTypes = ['visa','housing','program','job','shop','flight','travel','health','education','custom'] as const;
  const type: Task['type'] = (validTypes as readonly string[]).includes(typeCandidate)
    ? (typeCandidate as Task['type'])
    : 'custom';

  const rawDue = obj.due_date;
  const due_date =
    typeof rawDue === 'string' ? rawDue :
    rawDue === null || typeof rawDue === 'undefined' ? null :
    null;

  if (!title) return null;
  return { title, type, due_date };
}

let tasks: Task[] = [];
try {
  // 1) fenced ```json ... ```
  const fenced = reply.match(/```json([\s\S]*?)```/i);
  let raw = fenced ? fenced[1].trim() : "";

  // 2) if not fenced, try trailing {...} at end of the reply
  if (!raw) {
    const lastBrace = reply.lastIndexOf("{");
    if (lastBrace !== -1) {
      const candidate = reply.slice(lastBrace).trim();
      if (candidate.endsWith("}")) raw = candidate;
    }
  }

  if (raw) {
    const parsedUnknown = JSON.parse(raw) as unknown;
    let arr: unknown[] = [];
    if (parsedUnknown && typeof parsedUnknown === 'object' && 'tasks' in parsedUnknown) {
      const maybe = (parsedUnknown as { tasks?: unknown }).tasks;
      if (Array.isArray(maybe)) arr = maybe;
    }
    tasks = arr.map(toTask).filter((t): t is Task => t !== null);
  }
} catch {
  // ignore parse errors
}


return NextResponse.json({ reply, tasks });
} catch (e: unknown) {
    // Provide a concise error message to the UI
    const msg =
      typeof e === "string" ? e :
      (e && typeof e === "object" && "message" in e && typeof (e as {message?:unknown}).message === "string")
        ? (e as {message:string}).message
        : "Copilot failed";
    console.error("copilot api error:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

}
