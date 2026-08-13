import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { groups } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Gitwork Toolbox — tools, prompts and kits for the studio",
    template: "%s — Gitwork Toolbox",
  },
  description:
    "The studio's working reference for AI tools, Foundry starter prompts, skills and kits — with Gitwork's own verdict on what is worth using, what is worth building, and what to leave alone.",
  applicationName: "Gitwork Toolbox",
  // An internal studio reference with candid verdicts in it, so it stays out of
  // search results until someone decides otherwise.
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <SiteHeader groups={groups} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
