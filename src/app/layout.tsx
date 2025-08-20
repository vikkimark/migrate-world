import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "@/components/site-header";
import ToasterClient from "@/components/toaster-client";
import SiteFooter from "@/components/site-footer";
import AnalyticsProvider from "@/components/analytics-provider";


export const metadata: Metadata = {
  metadataBase: new URL("https://migrate-world.vercel.app"),
  title: {
    default: "Migrate World — AI Relocation Copilot",
    template: "%s | Migrate World",
  },
  description:
    "AI-powered relocation guide for students moving to Ottawa & Toronto: programs, visa links, housing, jobs, and a personal checklist.",
  openGraph: {
    title: "Migrate World — AI Relocation Copilot",
    description:
      "Programs, visas, housing, jobs, and a personal checklist for students moving to Ottawa & Toronto.",
    url: "/",
    siteName: "Migrate World",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Migrate World — AI Relocation Copilot",
    description:
      "Programs, visas, housing, jobs, and a personal checklist for students moving to Ottawa & Toronto.",
  },
  alternates: {
    canonical: "/",
  },
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
	<SiteFooter />
	<ToasterClient />
	<AnalyticsProvider />
      </body>
    </html>
  );
}
