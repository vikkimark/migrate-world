import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Student Housing in Ottawa & Toronto",
  description:
    "Curated student housing links near Carleton, uOttawa, UofT & more. Filter by city, open external listings, and save options to your checklist.",
  alternates: { canonical: "https://migrate-world.vercel.app/housing" },
};

export default function HousingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
