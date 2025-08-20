import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in with a magic link to access your personal relocation checklist and saved items.",
  alternates: { canonical: "https://migrate-world.vercel.app/signup" },
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
