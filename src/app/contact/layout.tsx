import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Send us a message for support, suggestions, or partnerships.",
  alternates: { canonical: "https://migrate-world.vercel.app/contact" },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
