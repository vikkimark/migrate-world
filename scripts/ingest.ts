/* scripts/ingest.ts
 * Robust, low-memory ingestion:
 * - Streams HTML (no full DOM)
 * - Skips <script>/<style>/<noscript>
 * - Captures <title> and visible text
 * - Truncates at MAX_CHARS
 * - Batches embeddings + inserts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { Parser } from "htmlparser2";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

if (!SUPABASE_URL || !SERVICE || !OPENAI_API_KEY) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE / OPENAI_API_KEY");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const MAX_CHARS = Number(process.env.INGEST_MAX_CHARS || 90000);  // trim big pages
const CHUNK_SIZE = Number(process.env.INGEST_CHUNK_SIZE || 700);
const CHUNK_OVERLAP = Number(process.env.INGEST_CHUNK_OVERLAP || 100);
const BATCH = Number(process.env.INGEST_BATCH || 20);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function chunk(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + size, text.length);
    const part = text.slice(i, end);
    if (part.replace(/\s/g, "").length > 40) chunks.push(part.trim());
    i = end - overlap;
    if (i < 0) i = 0;
  }
  return chunks;
}

async function upsertSource(name: string, url: string) {
  const { data, error } = await sb
    .from("kb_sources")
    .upsert({ name, url }, { onConflict: "url" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as number;
}

/** Stream HTML; keep only visible content tags; store small pieces (no big concat). */
async function extractFromUrl(url: string): Promise<{ title: string; text: string }> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);

  let title = "";
  const pieces: string[] = [];
  let total = 0;

  // track whether we’re in content tags and not in <script/style/noscript>
  let inTitle = false;
  let skipDepth = 0;
  let contentDepth = 0;
  const CONTENT_TAGS = new Set(["p","li","h1","h2","h3","h4","article","section"]);

  const parser = new Parser(
    {
      onopentag(name) {
        const n = name.toLowerCase();
        if (n === "title") inTitle = true;
        if (n === "script" || n === "style" || n === "noscript") skipDepth++;
        if (CONTENT_TAGS.has(n)) contentDepth++;
      },
      ontext(data) {
        if (inTitle) {
          title += data;
          return;
        }
        if (skipDepth > 0 || contentDepth === 0) return;
        // normalize just this small slice
        const s = data.replace(/\s+/g, " ").trim();
        if (!s) return;
        // push only until MAX_CHARS
        const room = MAX_CHARS - total;
        if (room <= 0) return;
        const slice = s.length > room ? s.slice(0, room) : s;
        pieces.push(slice);
        total += slice.length;
        if (total >= MAX_CHARS) {
          parser.end(); // stop parser early
        }
      },
      onclosetag(name) {
        const n = name.toLowerCase();
        if (n === "title") inTitle = false;
        if (n === "script" || n === "style" || n === "noscript") {
          if (skipDepth > 0) skipDepth--;
        }
        if (CONTENT_TAGS.has(n) && contentDepth > 0) contentDepth--;
      },
    },
    { decodeEntities: true }
  );

  // stream read → parser; break as soon as we reach the limit
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    parser.write(decoder.decode(value, { stream: true }));
    if (total >= MAX_CHARS) break;
  }
  parser.end();

  const cleanTitle = title.replace(/\s+/g, " ").trim();
  const text = pieces.join(" ");
  return { title: cleanTitle, text };
}

async function ingestOne(name: string, url: string) {
  console.log("Ingest:", name, url);
  const origin = new URL(url).origin;
  const source_id = await upsertSource(name, origin);

  const { title, text } = await extractFromUrl(url);
  const safeText = text.slice(0, MAX_CHARS);
  const pieces = chunk(safeText);
  console.log(`Chunks: ${pieces.length}  (title="${title || name}")`);

  let inserted = 0;
  for (let i = 0; i < pieces.length; i += BATCH) {
    const batch = pieces.slice(i, i + BATCH);

    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: batch,
    });

    const rows = emb.data.map((d, idx) => ({
      source_id,
      url,
      title: title || name,
      content: batch[idx],
      embedding: d.embedding,
    }));

    const { error } = await sb.from("kb_chunks").insert(rows);
    if (error) {
      console.error("insert error:", error);
    } else {
      inserted += rows.length;
      process.stdout.write(`Inserted ${inserted}/${pieces.length}\r`);
    }
    await sleep(120);
  }
  console.log(`\nDone: ${inserted} chunks`);
}

async function main() {
  // Start with just one big official page to confirm stability
  await ingestOne(
    "IRCC — Study Permit",
    "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada.html"
  );

  // Run the next one after the first succeeds
  await ingestOne("Carleton — Admissions", "https://admissions.carleton.ca/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
