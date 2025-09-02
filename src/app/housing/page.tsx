'use client';
import { posthog } from "@/lib/analytics";
import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { sleep } from "@/lib/sleep";
const supabase = getSupabase();

type Housing = {
  id: string;
  title: string;
  city: "Ottawa" | "Toronto";
  near: string;
  url: string;
  price?: string;
  furnished?: boolean;
  provider?: string;
};

const HOUSING: Housing[] = [
  {
    id: "ott-1",
    title: "Student residence near Carleton (shared)",
    city: "Ottawa",
    near: "Carleton University",
    url: "https://www.student.com/ca/ottawa",
    price: "$800–$1,100/mo",
    furnished: true,
    provider: "student.com",
  },
  {
    id: "ott-2",
    title: "1BR Apartment near uOttawa (ByWard Market)",
    city: "Ottawa",
    near: "University of Ottawa",
    url: "https://rentals.ca/ottawa",
    price: "$1,700–$2,200/mo",
    furnished: false,
    provider: "rentals.ca",
  },
  {
    id: "tor-1",
    title: "Downtown shared room near TMU (Ryerson)",
    city: "Toronto",
    near: "Toronto Metropolitan University",
    url: "https://www.student.com/ca/toronto",
    price: "$900–$1,300/mo",
    furnished: true,
    provider: "student.com",
  },
  {
    id: "tor-2",
    title: "Studio near UofT St. George",
    city: "Toronto",
    near: "University of Toronto",
    url: "https://rentals.ca/toronto",
    price: "$1,800–$2,400/mo",
    furnished: false,
    provider: "rentals.ca",
  },
];

export default function HousingPage() {
  const [city, setCity] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return HOUSING.filter(h => {
      const cityOk = city ? h.city === city : true;
      const qOk = query
        ? h.title.toLowerCase().includes(query) ||
          h.near.toLowerCase().includes(query) ||
          (h.provider ?? "").toLowerCase().includes(query)
        : true;
      return cityOk && qOk;
    });
  }, [city, q]);

  async function handleSave(h: Housing) {
    setSavingId(h.id);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setSavingId(null);
      alert("Please sign in first. You’ll be redirected to Sign in.");
      window.location.href = "/signup";
      return;
    }
    const title = `${h.title} — ${h.city}`;
    const { error } = await supabase.from("checklist_items").insert([{
      user_id: user.id,
      type: "housing",
      ref_table: "external_housing",
      ref_id: null,
      title,
      status: "todo",
      due_date: null
    }]);
    setSavingId(null);
    if (error) {
      console.error("save housing error:", error);
      alert("Could not save. Please try again.");
      return;
    }
    const go = confirm("Saved to your checklist. Open checklist now?");
    if (go) await sleep(250);
    window.location.href = "/checklist";

    posthog.capture("saved_to_checklist", { type: "housing", ref_table: "external_housing", ref_id:           	h.id });
  }

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Housing</h1>
      <p className="text-zinc-600 mt-1">
        Curated student housing and rentals near campuses in Ottawa & Toronto. These are external links; verify details with the provider.
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

        <div className="flex-1 min-w-[220px]">
          <label className="block text-sm mb-1">Search</label>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Try: Carleton, UofT, furnished, student.com…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <button className="border rounded px-3 py-2" onClick={() => { setCity(""); setQ(""); }}>
          Clear
        </button>
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {filtered.map(h => (
          <li key={h.id} className="border rounded p-4 flex flex-col justify-between">
            <div>
              <div className="text-sm text-zinc-500">{h.city} • {h.near}</div>
              <div className="font-medium mt-1">{h.title}</div>
              <div className="text-sm text-zinc-600 mt-1">
                {h.price ? `Approx: ${h.price}` : "Price varies"}{h.furnished ? " • Furnished" : ""}
                {h.provider ? ` • ${h.provider}` : ""}
              </div>
              <a
                className="text-blue-600 underline mt-2 inline-block"
                href={h.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View listing
              </a>
            </div>
            <div className="mt-3">
              <Button size="sm" onClick={() => handleSave(h)} disabled={savingId === h.id}>
                {savingId === h.id ? "Saving…" : "Add to checklist"}
              </Button>
            </div>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="text-zinc-500">No results — adjust your filters or search term.</li>
        )}
      </ul>

      <p className="mt-6 text-xs text-zinc-500">
        Disclaimer: We link out to third-party sites. We don’t manage these properties. Always verify availability, pricing, and terms.
      </p>
    </section>
  );
}
