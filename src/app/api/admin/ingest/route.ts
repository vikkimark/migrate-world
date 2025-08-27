import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Body = { title?: string; url?: string; content?: string };

function stripHtml(html: string): string {
  let txt = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
  txt = txt.replace(/<[^>]+>/g, " ");
  txt = txt.replace(/\s+/g, " ").trim();
  return txt;
}
function chunk(text: string, size = 420, overlap = 50): string[] {
  const chunks: string[] = [];
  const step = Math.max(1, size - overlap);
  for (let i = 0; i < text.length; i += step) chunks.push(text.slice(i, i + size));
  return chunks;
}

export async function POST(req: Request) {
  const admin = process.env.ADMIN_TOKEN;
  if (!admin) return NextResponse.json({ error: "Server missing ADMIN_TOKEN" }, { status: 500 });
  const hdr = req.headers.get("x-admin-token");
  if (hdr !== admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE;
if (!SUPABASE_URL || !SERVICE_KEY) {
  return NextResponse.json({ error: "Missing Supabase server env" }, { status: 500 });
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

  const body = (await req.json().catch(() => ({}))) as Body;
  const title = (body.title || "").trim();
  const url = (body.url || "").trim();
  let content = (body.content || "").trim();
  if (!title || (!url && !content)) return NextResponse.json({ error: "Need title and either url or content" }, { status: 400 });

  if (url && !content) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      const html = await r.text();
      content = stripHtml(html);
    } catch {
      return NextResponse.json({ error: "Failed to fetch URL" }, { status: 400 });
    }
  }

  // Create/find source
  let sourceId: number | null = null;
  if (url) {
    const existing = await sb.from("kb_sources").select("id").eq("url", url).maybeSingle();
    if (existing.data?.id) sourceId = existing.data.id;
  }
  if (!sourceId) {
    const ins = await sb
  .from("kb_sources")
  .insert({ title, name: title, url: url || null })
  .select("id")
  .single();
if (ins.error) {
  return NextResponse.json({ error: ins.error.message }, { status: 500 });
}
const sourceId = ins.data.id as number;
  }

  const size = Number(process.env.INGEST_CHUNK_SIZE || 420);
  const overlap = Number(process.env.INGEST_CHUNK_OVERLAP || 50);
  const rows = chunk(content, size, overlap).map((c) => ({
    source_id: sourceId!,
    url: url || "",
    title,
    content: c,
  }));

  const ins2 = await sb.from("kb_chunks").insert(rows);
  if (ins2.error) return NextResponse.json({ error: ins2.error.message }, { status: 500 });

  return NextResponse.json({ ok: true, chunks: rows.length });
}
