import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Programs",
  description: "Browse programs, open official apply links, and save items to your checklist.",
  alternates: { canonical: "https://migrate-world.vercel.app/programs" },
};

export default function ProgramsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
