'use client';
import { posthog } from "@/lib/analytics";
import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { sleep } from "@/lib/sleep";
const supabase = getSupabase();


type VisaLink = {
  id: number;
  country_from: string;
  country_to: string;
  purpose: string;
  url: string;
  notes: string | null;
};

export default function VisaPage() {
  const [links, setLinks] = useState<VisaLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState<string>("India"); // default filter
  const [purpose, setPurpose] = useState<string>(""); // new filter
  const [savingId, setSavingId] = useState<number | null>(null);
  const to = "Canada";

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("visa_links")
        .select("*")
        .eq("country_to", to)
        .in("country_from", ["India", "Nigeria"])
        .order("country_from", { ascending: true });

      if (!mounted) return;
      if (error) console.error("visa_links error:", error);
      setLinks(data ?? []);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const purposes = useMemo(() => {
    return Array.from(new Set(links.map(l => l.purpose))).sort();
  }, [links]);

  const filtered = useMemo(() => {
    return links.filter(l =>
      (from ? l.country_from === from : true) &&
      (purpose ? l.purpose === purpose : true)
    );
  }, [links, from, purpose]);

  async function handleSave(v: VisaLink) {
  setSavingId(v.id);

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    setSavingId(null);
    alert("Please sign in first. You’ll be redirected to Sign in.");
    window.location.href = "/signup";
    return;
  }

  const title = `${v.purpose} — ${v.country_from} → ${v.country_to}`;

  // 1) Save to checklist (DB)
  const { error } = await supabase.from("checklist_items").insert([{
    user_id: user.id,
    type: "visa",
    ref_table: "visa_links",
    ref_id: v.id,
    title,
    status: "todo",
    due_date: null
  }]);

  setSavingId(null);

  if (error) {
    console.error("save visa error:", error);
    alert("Could not save. Please try again.");
    return;
  }

  //  Analytics event
  posthog.capture("saved_to_checklist", {
    type: "visa",
    ref_table: "visa_links",
    ref_id: v.id,
  });

const go = confirm("Saved to your checklist. Open checklist now?");
if (go) {
  await sleep(250);         // give the capture a moment to send
  window.location.href = "/checklist";
}

}

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Visa links</h1>
      <p className="text-zinc-600 mt-1">Official resources for students and families moving to Canada.</p>

      <div className="mt-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm mb-1">From country</label>
          <select
            className="border rounded px-3 py-2"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          >
            <option value="India">India</option>
            <option value="Nigeria">Nigeria</option>
            <option value="">All</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Purpose</label>
          <select
            className="border rounded px-3 py-2"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          >
            <option value="">All</option>
            {purposes.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="mt-6">Loading…</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {filtered.map((v) => (
            <li key={v.id} className="border rounded p-4">
              <div className="text-sm text-zinc-500">
                {v.country_from} → {v.country_to}
              </div>
              <div className="font-medium mt-1">{v.purpose}</div>
              <a
                className="text-blue-600 underline mt-1 inline-block"
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open official portal
              </a>
              {v.notes ? <div className="text-sm text-zinc-600 mt-1">{v.notes}</div> : null}

              <div className="mt-3">
                <Button
                  size="sm"
                  onClick={() => handleSave(v)}
                  disabled={savingId === v.id}
                >
                  {savingId === v.id ? "Saving…" : "Add to checklist"}
                </Button>
              </div>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="text-zinc-500">No links found for that filter.</li>
          )}
        </ul>
      )}

      <p className="mt-6 text-xs text-zinc-500">
        Disclaimer: We link to official government pages. This is not legal advice. Always verify
        requirements and deadlines on the official portal.
      </p>

	<div className="mt-4 text-xs">
  	See something wrong? <a className="underline" href="/contact">Send us a message</a> with the 	correct link.
	</div>
    </section>
  );
}
