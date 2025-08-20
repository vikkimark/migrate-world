import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Housing",
  description: "Curated student housing and rental links. Open external listings and save options to your checklist.",
  alternates: { canonical: "https://migrate-world.vercel.app/housing" },
};

export default function HousingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
