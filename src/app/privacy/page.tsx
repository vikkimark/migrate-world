export default function PrivacyPage() {
  return (
    <section className="max-w-3xl">
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Privacy</h1>
      <p className="mt-2 text-zinc-600">
        Your privacy matters. This page explains what we collect and how we use it.
      </p>

      <h2 className="mt-8 text-xl font-semibold">What we collect</h2>
      <ul className="mt-2 text-zinc-700 list-disc pl-5 space-y-1">
        <li>Contact info: email (for sign-in and updates).</li>
        <li>Lead details you provide: origin/destination, city, intake month, notes.</li>
        <li>Usage data: basic logs/metrics to improve reliability and features.</li>
      </ul>

      <h2 className="mt-6 text-xl font-semibold">How we use it</h2>
      <ul className="mt-2 text-zinc-700 list-disc pl-5 space-y-1">
        <li>To provide and improve the service (e.g., checklists, saved items).</li>
        <li>To contact you about your relocation plan or important updates.</li>
      </ul>

      <h2 className="mt-6 text-xl font-semibold">Sharing</h2>
      <p className="mt-2 text-zinc-700">
        We don’t sell your data. We may use processors (e.g., hosting, database) who handle data on our behalf.
      </p>

      <h2 className="mt-6 text-xl font-semibold">Data retention</h2>
      <p className="mt-2 text-zinc-700">
        We keep data as long as needed for the service. You can request deletion via email.
      </p>

      <h2 className="mt-6 text-xl font-semibold">Security</h2>
      <p className="mt-2 text-zinc-700">
        We use industry practices and reputable infrastructure providers. No system is 100% secure.
      </p>

      <h2 className="mt-6 text-xl font-semibold">Your choices</h2>
      <p className="mt-2 text-zinc-700">
        Contact us to access or delete your data.
      </p>

      <h2 className="mt-6 text-xl font-semibold">Contact</h2>
      <p className="mt-2 text-zinc-700">
        Email <a className="underline" href="mailto:hello@yourdomain.com">hello@yourdomain.com</a>.
      </p>

      <h2 className="mt-6 text-xl font-semibold">Changes</h2>
      <p className="mt-2 text-zinc-700">
        We may update this policy; check this page for the latest version.
      </p>
    </section>
  );
}
