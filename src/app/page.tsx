import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <section className="mx-auto max-w-5xl">
      <div className="py-10">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          Your AI relocation copilot for students moving to Ottawa & Toronto
        </h1>
        <p className="mt-3 text-zinc-600">
          Discover programs, visa links, housing, and a personalized checklist — all in one place.
        </p>

        <div className="mt-6 flex items-center gap-3">
          <Button asChild size="lg">
            <Link href="/programs">Browse programs</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/visa">Visa links</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}