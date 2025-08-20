import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop",
  description: "All-season and winter essentials plus Indian/Nigerian groceries and major chains. Save items to your checklist.",
  alternates: { canonical: "https://migrate-world.vercel.app/shop" },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
