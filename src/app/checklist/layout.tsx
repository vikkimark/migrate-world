import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My checklist",
  description: "Track programs, visas, housing, jobs, flights, and custom tasks. Toggle done/undo and set due dates.",
  alternates: { canonical: "https://migrate-world.vercel.app/checklist" },
};

export default function ChecklistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
