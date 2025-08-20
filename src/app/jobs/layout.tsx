import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jobs",
  description: "Quick links to student part-time and entry-level full-time job searches. Save postings to your checklist.",
  alternates: { canonical: "https://migrate-world.vercel.app/jobs" },
};

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
