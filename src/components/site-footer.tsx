export default function SiteFooter() {
  return (
    <footer className="border-t mt-10">
      <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-zinc-600 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>© {new Date().getFullYear()} Migrate World</div>
        <nav className="flex gap-4">
          <a className="hover:underline" href="/terms">Terms</a>
          <a className="hover:underline" href="/privacy">Privacy</a>
          <a className="hover:underline" href="/contact">Contact</a> {/* ← changed */}
        </nav>
      </div>
    </footer>
  );
}
