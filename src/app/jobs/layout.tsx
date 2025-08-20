import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jobs in Ottawa & Toronto (Student PT & Entry-level FT)",
  description:
    "Quick links to student part-time and entry-level full-time job searches in Ottawa and Toronto. Open searches on major boards and save to your checklist.",
  alternates: { canonical: "https://migrate-world.vercel.app/jobs" },
};

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
