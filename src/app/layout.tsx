import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
import { SiteFooter } from "@/components/site-footer";
import { ThemeScript } from "@/components/theme-toggle";
import { counts, groups, meta } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Gitwork Toolbox — tools, prompts and kits for the studio",
    template: "%s — Gitwork Toolbox",
  },
  description:
    "The studio's working reference: the tools Gitwork has actually assessed, the Foundry starter library, and the verdict on what to use, what to build and what to leave alone.",
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
        <ThemeScript />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600;1,700&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>
        <div className="flex min-h-screen flex-col lg:flex-row">
          <Sidebar
            counts={counts}
            groups={groups}
            toolFacets={meta.toolFacets}
            starterFacets={meta.starterFacets}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </div>
      </body>
    </html>
  );
}
