'use client';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { posthog } from "@/lib/analytics";

export default function Home() {
  return (
   <section>
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
        Your AI relocation copilot for students, professionals, and families
      </h1>
      <p className="mt-3 text-zinc-600 max-w-2xl">
        Plan your move end-to-end: discover programs, follow official visa links,
        find housing and jobs, shop essentials, and track everything in a personal checklist.
      </p>

      <div className="mt-6 flex gap-3 lg=b">
  	<Link
    	   href="/start"
  	   onClick={() => posthog.capture("cta_start_plan_click", { location: "home_hero" })}
    	   className="inline-block rounded px-4 py-2 bg-black text-white hover:bg-black/90 		   focus:outline-none focus:ring-2 focus:ring-black/40">
   	   Start your plan
 	 </Link>
      </div>

      <ul className="mt-8 grid gap-2 sm:grid-cols-2 text-sm text-zinc-700">
        <li>✓ University & college programs (apply links)</li>
        <li>✓ Official visa portals (study, work, TRV, PR, Super Visa)</li>
        <li>✓ Student housing & rentals (save to checklist)</li>
        <li>✓ Jobs: student part-time & entry-level full-time</li>
        <li>✓ Shop essentials: winter & all-season, Indian/Nigerian groceries</li>
        <li>✓ Magic-link sign-in and personal checklist</li>
      </ul>
    </section>
  );
}