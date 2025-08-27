import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Copilot",
  description: "Ask questions and turn answers into a personal relocation checklist.",
  alternates: { canonical: "https://migrate-world.vercel.app/copilot" },
};

export default function CopilotLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
