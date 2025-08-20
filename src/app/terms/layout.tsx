import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Terms",
  description: "Terms of service for using Migrate World.",
  alternates: { canonical: "https://migrate-world.vercel.app/terms" },
};
export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
