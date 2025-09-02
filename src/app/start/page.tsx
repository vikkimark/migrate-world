'use client';

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";
import Link from "next/link";
import { toast } from "sonner";
import { posthog } from "@/lib/analytics";
const supabase = getSupabase();


export default function StartPage() {
  const [email, setEmail] = useState("");
  const [fromCountry, setFromCountry] = useState("India");
  const [toCountry] = useState("Canada"); // fixed for v0
  const [city, setCity] = useState("Ottawa");
  const [intake, setIntake] = useState("September");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validEmail(v: string) {
    return /\S+@\S+\.\S+/.test(v);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!validEmail(email)) {
      setError("Please enter a valid email.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("leads").insert([
      {
        email,
        country_from: fromCountry,
        country_to: toCountry,
        city,
        intake_month: intake,
        notes: notes || null,
      },
    ]);
    setSubmitting(false);
    if (error) {
      console.error("lead insert error:", error);
      setError("Could not submit. Please try again.");
      return;
    }
    setDone(true);

   
    if (error) {
  	console.error("lead insert error:", error);
  	setError("Could not submit. Please try again.");
  	toast.error("Could not submit. Please try again.");   
  	return;
	}
	// success:
	setDone(true);
	toast.success("Thanks — you’re on the list!");  
	
	posthog.capture("lead_submitted", {
  	country_from: fromCountry,
  	country_to: toCountry,
  	city,
  	intake_month: intake,
	});
    
  }

  if (done) {
    return (
      <section className="max-w-xl">
        <h1 className="text-2xl font-semibold tracking-tight">Thanks — you’re on the list!</h1>
        <p className="mt-2 text-zinc-600">
          We’ll reach out with a tailored plan. Meanwhile, you can{" "}
          <Link className="underline" href="/signup">sign in</Link> to start your checklist,
          or browse <Link className="underline" href="/programs">Programs</Link> and{" "}
          <Link className="underline" href="/visa">Visa links</Link>.
        </p>
      </section>
    );
  }

  return (
    <section className="max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Get started</h1>
      <p className="mt-2 text-zinc-600">
        Tell us a few details and we’ll personalize your relocation plan.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            className="w-full border rounded px-3 py-2"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm mb-1">From country</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={fromCountry}
              onChange={(e) => setFromCountry(e.target.value)}
            >
              <option>India</option>
              <option>Nigeria</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">To country</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={toCountry}
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Destination city</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              <option>Ottawa</option>
              <option>Toronto</option>
              <option>Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Target intake month</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={intake}
              onChange={(e) => setIntake(e.target.value)}
            >
              <option>January</option>
              <option>May</option>
              <option>September</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Notes (optional)</label>
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="Program interest, questions, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {error ? <div className="text-red-600 text-sm">{error}</div> : null}

        <div>
          <button
            className="border rounded px-4 py-2"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </form>
    </section>
  );
}
