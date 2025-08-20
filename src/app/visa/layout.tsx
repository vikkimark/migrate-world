import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Visa links",
  description: "Official links for study, work, visitor (TRV), PR, and Super Visa. Filter by purpose and save to your checklist.",
  alternates: { canonical: "https://migrate-world.vercel.app/visa" },
};

export default function VisaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
