import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get started",
  description:
    "Share your email, corridor, city, and intake month to get a personalized relocation plan and checklist.",
  alternates: { canonical: "https://migrate-world.vercel.app/start" },
};

export default function StartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
