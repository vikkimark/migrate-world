import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { Parser } from "htmlparser2";

(function () {
  var k = process.env.OPENAI_API_KEY || "";
  console.log("Using OpenAI key prefix:", k.slice(0, 6));
})();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const USE_EMBEDDINGS = process.env.USE_EMBEDDINGS !== "false"; // default true; set false to skip embeddings

if (!SUPABASE_URL || !SERVICE || !OPENAI_API_KEY) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE / OPENAI_API_KEY");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Preferred embedding model; we’ll auto-fallback if access is denied.
const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-large";

// conservative defaults (override via env when running)
const MAX_CHARS = Number(process.env.INGEST_MAX_CHARS || 30000);
const CHUNK_SIZE = Number(process.env.INGEST_CHUNK_SIZE || 480);
const CHUNK_OVERLAP = Number(process.env.INGEST_CHUNK_OVERLAP || 60);
const SLEEP_MS = Number(process.env.INGEST_SLEEP_MS || 140);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function upsertSource(name: string, originUrl: string): Promise<number> {
  const res = await sb
    .from("kb_sources")
    .upsert({ name, url: originUrl }, { onConflict: "url" })
    .select("id")
    .single();
  if (res.error) throw res.error;
  return res.data!.id as number;
}

async function embedAndInsert(params: {
  source_id: number;
  url: string;
  title: string;
  content: string;
}) {
  const text = params.content;
  if (text.replace(/\s/g, "").length < 40) return;

  // If embeddings are disabled, insert without the vector
  if (!USE_EMBEDDINGS) {
    const ins = await sb.from("kb_chunks").insert({
      source_id: params.source_id,
      url: params.url,
      title: params.title,
      content: text,
      // no 'embedding' field — column can be NULL
    });
    if (ins.error) console.error("insert error:", ins.error);
    return;
  }

  // Embeddings ON (will still auto-fallback if your key has access)
  let model = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-large";
  let emb: any;
  try {
    emb = await openai.embeddings.create({ model, input: text });
  } catch (e: any) {
    const msg = String(e?.message || "");
    const accessIssue = msg.includes("model_not_found") || msg.includes("does not have access");
    if (accessIssue) {
      model = "text-embedding-ada-002";
      emb = await openai.embeddings.create({ model, input: text });
    } else {
      throw e;
    }
  }

  const vector = emb.data[0].embedding;
  const ins = await sb.from("kb_chunks").insert({
    source_id: params.source_id,
    url: params.url,
    title: params.title,
    content: text,
    embedding: vector,
  });
  if (ins.error) console.error("insert error:", ins.error);
}


async function ingestOne(name: string, url: string) {
  console.log("Ingest:", name, url);
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error("Fetch failed: " + res.status + " " + res.statusText);

  const origin = new URL(url).origin;
  const source_id = await upsertSource(name, origin);

  let title = "";
  let inTitle = false;
  let skipDepth = 0; // in script/style/noscript
  let contentDepth = 0; // inside content tags

  const CONTENT_TAGS: Record<string, 1> = {
    p: 1, li: 1, h1: 1, h2: 1, h3: 1, h4: 1, article: 1, section: 1, main: 1,
  };

  // rolling buffer for on-the-fly chunking
  let buf = "";
  let total = 0;
  let insertedApprox = 0;

  async function drainChunks(final: boolean) {
    while (buf.length >= CHUNK_SIZE) {
      const piece = buf.slice(0, CHUNK_SIZE);
      buf = buf.slice(CHUNK_SIZE - CHUNK_OVERLAP);
      await embedAndInsert({
        source_id,
        url,
        title: title ? title.replace(/\s+/g, " ").trim() : name,
        content: piece.trim(),
      });
      insertedApprox++;
      await sleep(SLEEP_MS);
    }
    if (final) {
      const tail = buf.trim();
      if (tail.replace(/\s/g, "").length >= 40) {
        await embedAndInsert({
          source_id,
          url,
          title: title ? title.replace(/\s+/g, " ").trim() : name,
          content: tail,
        });
        insertedApprox++;
      }
      buf = "";
    }
  }

  const parser = new Parser(
    {
      onopentag(tag) {
        const n = tag.toLowerCase();
        if (n === "title") inTitle = true;
        if (n === "script" || n === "style" || n === "noscript") skipDepth++;
        if (CONTENT_TAGS[n]) contentDepth++;
      },
      ontext(txt) {
        if (inTitle) {
          title += txt;
          return;
        }
        if (skipDepth > 0 || contentDepth === 0) return;

        const s = txt.replace(/\s+/g, " ").trim();
        if (!s) return;

        const room = MAX_CHARS - total;
        if (room <= 0) return;
        const slice = s.length > room ? s.slice(0, room) : s;

        if (buf) buf += " ";
        buf += slice;
        total += slice.length;
        // We can't await here (parser callback). We'll drain after each network chunk.
      },
      onclosetag(tag) {
        const n = tag.toLowerCase();
        if (n === "title") inTitle = false;
        if (n === "script" || n === "style" || n === "noscript") {
          if (skipDepth > 0) skipDepth--;
        }
        if (CONTENT_TAGS[n] && contentDepth > 0) contentDepth--;
      },
    },
    { decodeEntities: true }
  );

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const r = await reader.read();
    if (r.done) break;
    const chunkStr = decoder.decode(r.value, { stream: true });
    parser.write(chunkStr);

    // After feeding the parser with this network chunk, drain chunks if big enough
    if (buf.length >= CHUNK_SIZE + CHUNK_OVERLAP) {
      await drainChunks(false);
    }
    if (total >= MAX_CHARS) break; // stop early if we hit our limit
  }
  parser.end();

  // Emit any leftover content
  await drainChunks(true);

  console.log('Done: inserted ~' + insertedApprox + ' chunks  (title="' + (title ? title.replace(/\s+/g, " ").trim() : name) + '")');
}

async function main() {
  await ingestOne(
    "IRCC — Study Permit",
    "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada.html"
  );
  await ingestOne("Carleton — Admissions", "https://admissions.carleton.ca/");
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
