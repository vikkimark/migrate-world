'use client';
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Migrate<span className="text-zinc-500">World</span>
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/programs" className="text-sm hover:underline">Programs</Link>
          <Link href="/housing" className="text-sm hover:underline">Housing</Link>
          <Link href="/visa" className="text-sm hover:underline">Visa</Link>
          <Link href="/checklist" className="text-sm hover:underline">Checklist</Link>
          <Button asChild size="sm">
            <Link href="/signup">Get started</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
