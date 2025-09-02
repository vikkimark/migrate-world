'use client';
import { posthog } from "@/lib/analytics";
import { useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { sleep } from "@/lib/sleep";
const supabase = getSupabase();

type JobItem = {
  id: string;
  title: string;
  city: "Ottawa" | "Toronto";
  type: "Part-time" | "Full-time";
  company?: string;
  url: string; // external search or posting
  source?: string; // indeed / adzuna / employer
};

const JOBS: JobItem[] = [
  // Ottawa
  {
    id: "ott-pt-indeed",
    title: "Student part-time jobs (Ottawa) — Indeed search",
    city: "Ottawa",
    type: "Part-time",
    url: "https://ca.indeed.com/jobs?q=student+part+time&l=Ottawa%2C+ON",
    source: "Indeed",
  },
  {
    id: "ott-ft-indeed",
    title: "Full-time entry-level (Ottawa) — Indeed search",
    city: "Ottawa",
    type: "Full-time",
    url: "https://ca.indeed.com/jobs?q=entry+level&l=Ottawa%2C+ON",
    source: "Indeed",
  },
  {
    id: "ott-pt-adzuna",
    title: "Student part-time (Ottawa) — Adzuna search",
    city: "Ottawa",
    type: "Part-time",
    url: "https://www.adzuna.ca/search?what=student%20part%20time&where=Ottawa%2C%20ON",
    source: "Adzuna",
  },

  // Toronto
  {
    id: "tor-pt-indeed",
    title: "Student part-time jobs (Toronto) — Indeed search",
    city: "Toronto",
    type: "Part-time",
    url: "https://ca.indeed.com/jobs?q=student+part+time&l=Toronto%2C+ON",
    source: "Indeed",
  },
  {
    id: "tor-ft-indeed",
    title: "Full-time entry-level (Toronto) — Indeed search",
    city: "Toronto",
    type: "Full-time",
    url: "https://ca.indeed.com/jobs?q=entry+level&l=Toronto%2C+ON",
    source: "Indeed",
  },
  {
    id: "tor-pt-adzuna",
    title: "Student part-time (Toronto) — Adzuna search",
    city: "Toronto",
    type: "Part-time",
    url: "https://www.adzuna.ca/search?what=student%20part%20time&where=Toronto%2C%20ON",
    source: "Adzuna",
  },
];

export default function JobsPage() {
  const [city, setCity] = useState<string>("");
  const [kind, setKind] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return JOBS.filter(j => {
      const cityOk = city ? j.city === city : true;
      const kindOk = kind ? j.type === (kind as JobItem["type"]) : true;
      const qOk = query
        ? j.title.toLowerCase().includes(query) ||
          (j.company ?? "").toLowerCase().includes(query) ||
          (j.source ?? "").toLowerCase().includes(query)
        : true;
      return cityOk && kindOk && qOk;
    });
  }, [city, kind, q]);

  async function handleSave(j: JobItem) {
    setSavingId(j.id);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setSavingId(null);
      alert("Please sign in first. You’ll be redirected to Sign in.");
      window.location.href = "/signup";
      return;
    }
    const title = `${j.title} — ${j.city}`;
    const { error } = await supabase.from("checklist_items").insert([{
      user_id: user.id,
      type: "job",
      ref_table: "external_jobs",
      ref_id: null,
      title,
      status: "todo",
      due_date: null
    }]);
    setSavingId(null);
    if (error) {
      console.error("save job error:", error);
      alert("Could not save. Please try again.");
      return;
    }
    const go = confirm("Saved to your checklist. Open checklist now?");
    if (go) await sleep(250);
    window.location.href = "/checklist";

    posthog.capture("saved_to_checklist", { type: "job", ref_table: "external_jobs", ref_id: j.id });

  }

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
      <p className="text-zinc-600 mt-1">
        Curated job searches for Ottawa & Toronto (student part-time and entry-level full-time).
      </p>

      <div className="mt-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm mb-1">City</label>
          <select
            className="border rounded px-3 py-2"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            <option value="">All</option>
            <option value="Ottawa">Ottawa</option>
            <option value="Toronto">Toronto</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Type</label>
          <select
            className="border rounded px-3 py-2"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="">All</option>
            <option value="Part-time">Part-time</option>
            <option value="Full-time">Full-time</option>
          </select>
        </div>

        <div className="flex-1 min-w-[220px]">
          <label className="block text-sm mb-1">Search</label>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Try: student, cashier, barista, entry level…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <button className="border rounded px-3 py-2" onClick={() => { setCity(""); setKind(""); setQ(""); }}>
          Clear
        </button>
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {filtered.map(j => (
          <li key={j.id} className="border rounded p-4 flex flex-col justify-between">
            <div>
              <div className="text-sm text-zinc-500">{j.city} • {j.type}{j.source ? ` • ${j.source}` : ""}</div>
              <div className="font-medium mt-1">{j.title}</div>
              <a
                className="text-blue-600 underline mt-2 inline-block"
                href={j.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open search/posting
              </a>
            </div>
            <div className="mt-3">
              <Button size="sm" onClick={() => handleSave(j)} disabled={savingId === j.id}>
                {savingId === j.id ? "Saving…" : "Add to checklist"}
              </Button>
            </div>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="text-zinc-500">No results — adjust your filters or search term.</li>
        )}
      </ul>

      <p className="mt-6 text-xs text-zinc-500">
        Disclaimer: These are external job boards/searches. Always verify posting details and eligibility.
      </p>
    </section>
  );
}
