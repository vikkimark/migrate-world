// src/lib/supabase.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/** Create/get a singleton browser client lazily. */
export function getSupabase(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Throw only when actually used (not at import time)
  if (!url || !anon) {
    throw new Error("Supabase env missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)");
  }

  browserClient = createClient(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return browserClient;
}
