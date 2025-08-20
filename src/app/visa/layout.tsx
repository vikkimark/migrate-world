import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Visa links for India/Nigeria → Canada",
  description:
    "Official IRCC links for Study Permits, Work Permits, TRV (Visitor Visa), Permanent Residence, and Super Visa. Filter by country and purpose, save to your checklist.",
  alternates: { canonical: "https://migrate-world.vercel.app/visa" },
};

export default function VisaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
