import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Privacy",
  description: "Privacy policy describing what we collect and how we use it.",
  alternates: { canonical: "https://migrate-world.vercel.app/privacy" },
};
export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
