'use client';

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { posthog } from "@/lib/analytics";

type School = {
  id: number;
  name: string;
  city: string;
  province: string;
  website: string | null;
};

type Program = {
  id: number;
  school_id: number;
  name: string;
  degree_level: string | null;
  field: string | null;
  tuition_intl: number | null;
  intake_months: string[] | null;
  duration: string | null;
  app_link: string | null;
  notes: string | null;
};

export default function ProgramsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState<string>("");           // Ottawa / Toronto
  const [degree, setDegree] = useState<string>("");       // BSc / MSc / etc
  const [query, setQuery] = useState<string>("");         // free text
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const [{ data: sData, error: sErr }, { data: pData, error: pErr }] = await Promise.all([
        supabase.from("schools").select("*").limit(500),
        supabase.from("programs").select("*").limit(1000),
      ]);
      if (!mounted) return;
      if (sErr) console.error("schools error:", sErr);
      if (pErr) console.error("programs error:", pErr);
      setSchools(sData ?? []);
      setPrograms(pData ?? []);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const schoolById = useMemo(() => {
    const map = new Map<number, School>();
    for (const s of schools) map.set(s.id, s);
    return map;
  }, [schools]);

  const filtered = useMemo(() => {
    return programs.filter((p) => {
      const school = schoolById.get(p.school_id);
      const cityOk = city ? school?.city === city : true;
      const degreeOk = degree ? (p.degree_level ?? "").toLowerCase() === degree.toLowerCase() : true;
      const q = query.trim().toLowerCase();
      const queryOk = q
        ? (p.name?.toLowerCase().includes(q) ||
           (p.field ?? "").toLowerCase().includes(q) ||
           (school?.name ?? "").toLowerCase().includes(q))
        : true;
      return cityOk && degreeOk && queryOk;
    });
  }, [programs, schoolById, city, degree, query]);

  async function handleSave(p: Program) {
    setSavingId(p.id);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setSavingId(null);
      alert("Please sign in first. You’ll be redirected to Sign in.");
      window.location.href = "/signup";
      return;
    }
    const school = schoolById.get(p.school_id);
    const title = `${p.name} — ${school?.name ?? ""}`;
    const { error } = await supabase.from("checklist_items").insert([{
      user_id: user.id,
      type: "program",
      ref_table: "programs",
      ref_id: p.id,
      title,
      status: "todo",
      due_date: null
    }]);
    setSavingId(null);
    if (error) {
      console.error("save program error:", error);
      alert("Could not save. Please try again.");
      return;
    }
    const go = confirm("Saved to your checklist. Open checklist now?");
    if (go) window.location.href = "/checklist";
    
    posthog.capture("saved_to_checklist", { type: "program", ref_table: "programs", ref_id: p.id });
  }

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Programs</h1>
      <p className="text-zinc-600 mt-1">Search Ottawa & Toronto programs. Use filters or type keywords.</p>

      <div className="mt-4 flex flex-wrap gap-3 items-center">
        <div>
          <label className="block text-sm mb-1">City</label>
          <select className="border rounded px-3 py-2"
                  value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">All</option>
            <option value="Ottawa">Ottawa</option>
            <option value="Toronto">Toronto</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Degree</label>
          <select className="border rounded px-3 py-2"
                  value={degree} onChange={(e) => setDegree(e.target.value)}>
            <option value="">All</option>
            <option value="BSc">BSc</option>
            <option value="BCom">BCom</option>
            <option value="MSc">MSc</option>
            <option value="MASc">MASc</option>
            <option value="MEng">MEng</option>
            <option value="MScAC">MScAC</option>
            <option value="MDS">MDS</option>
          </select>
        </div>

        <div className="flex-1 min-w-[220px]">
          <label className="block text-sm mb-1">Search</label>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Program, field, or school…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <Button variant="outline" onClick={() => { setCity(""); setDegree(""); setQuery(""); }}>
          Clear
        </Button>
      </div>

      {loading ? (
        <p className="mt-6">Loading…</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-3">Program</th>
                <th className="text-left py-2 pr-3">School</th>
                <th className="text-left py-2 pr-3">City</th>
                <th className="text-left py-2 pr-3">Degree</th>
                <th className="text-left py-2 pr-3">Field</th>
                <th className="text-left py-2 pr-3">Tuition (Intl)</th>
                <th className="text-left py-2 pr-3">Intakes</th>
                <th className="text-left py-2 pr-3">Apply</th>
                <th className="text-left py-2 pr-3">Save</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const s = schoolById.get(p.school_id);
                return (
                  <tr key={p.id} className="border-b">
                    <td className="py-2 pr-3">{p.name}</td>
                    <td className="py-2 pr-3">{s?.name}</td>
                    <td className="py-2 pr-3">{s?.city}</td>
                    <td className="py-2 pr-3">{p.degree_level}</td>
                    <td className="py-2 pr-3">{p.field}</td>
                    <td className="py-2 pr-3">
                      {typeof p.tuition_intl === "number" ? `$${p.tuition_intl.toLocaleString()}` : "—"}
                    </td>
                    <td className="py-2 pr-3">{p.intake_months?.join(", ")}</td>
                    <td className="py-2 pr-3">
                      {p.app_link ? (
                        <a className="text-blue-600 underline" href={p.app_link} target="_blank" rel="noopener noreferrer">
                          Open
                        </a>
                      ) : "—"}
                    </td>
                    <td className="py-2 pr-3">
                      <Button
                        size="sm"
                        onClick={() => handleSave(p)}
                        disabled={savingId === p.id}
                      >
                        {savingId === p.id ? "Saving…" : "Add to checklist"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="py-6 text-center text-zinc-500">No programs match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
