'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function SiteHeader() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Load once on mount
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setEmail(data.user?.email ?? null);
    });

    // Subscribe to auth changes (login/logout)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setEmail(null);
    // Optional: refresh the page
    window.location.href = "/";
  }

  // Helper to shorten long emails
  const shortEmail =
    email && email.length > 24 ? `${email.slice(0, 12)}…${email.slice(-8)}` : email ?? "";

  return (
    <header className="border-b">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Migrate<span className="text-zinc-500">World</span>
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/programs" className="text-sm hover:underline">Programs</Link>
          <Link href="/housing" className="text-sm hover:underline">Housing</Link>
	  <Link href="/jobs" className="text-sm hover:underline">Jobs</Link>
          <Link href="/visa" className="text-sm hover:underline">Visa</Link>
          <Link href="/checklist" className="text-sm hover:underline">Checklist</Link>

          {email ? (
            <>
              <span className="hidden sm:inline text-xs text-zinc-600">
                Signed in: {shortEmail}
              </span>
              <Button size="sm" variant="outline" onClick={handleSignOut}>
                Sign out
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link href="/signup">Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
