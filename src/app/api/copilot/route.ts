import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const SYSTEM_PROMPT = `
You are the Migrate World Copilot.
Goal: Help users plan moves end-to-end (programs, visa links, housing, jobs, essentials) with clear, actionable steps.
Safety: You are not a lawyer; link to official portals and include brief disclaimers when relevant.
Style: Concise, friendly, step-by-step. Prefer lists and checkboxes.
Tasks JSON: When your reply implies next steps, also append a JSON block like:
\`\`\`json
{"tasks":[
  {"title":"Book biometrics appointment","type":"visa","due_date":null},
  {"title":"Shortlist 3 student housing options","type":"housing","due_date":"2025-09-01"}
]}
\`\`\`
Only include tasks that are obvious from the user’s request. Keep 3–7 tasks, max.
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

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: message },
  ] as const;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages,
  });

  const reply = completion.choices?.[0]?.message?.content ?? "";

 // Try to extract optional JSON tasks block
type Task = {
  title: string;
  type: 'visa' | 'housing' | 'program' | 'job' | 'shop' | 'flight' | 'custom';
  due_date: string | null;
};

function toTask(x: unknown): Task | null {
  if (!x || typeof x !== 'object') return null;
  const obj = x as Record<string, unknown>;

  const title = typeof obj.title === 'string' ? obj.title : '';
  const typeCandidate = typeof obj.type === 'string' ? obj.type : '';
  const validTypes = ['visa','housing','program','job','shop','flight','custom'] as const;
  const type: Task['type'] = (validTypes as readonly string[]).includes(typeCandidate)
    ? (typeCandidate as Task['type'])
    : 'custom';

  const dueRaw = obj.due_date;
  const due_date =
    typeof dueRaw === 'string' ? dueRaw :
    dueRaw === null || typeof dueRaw === 'undefined' ? null :
    null;

  if (!title) return null;
  return { title, type, due_date };
}

let tasks: Task[] = [];
try {
  const match = reply.match(/```json([\s\S]*?)```/i);
  const raw = match ? match[1].trim() : (reply.trim().startsWith("{") ? reply.trim() : "");

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
  // ignore parse errors; tasks remain empty
}

return NextResponse.json({ reply, tasks });


}
