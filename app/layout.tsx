import type { Metadata } from "next";
import { Anton, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SiteNav } from "@/components/SiteNav";

const anton = Anton({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-stat",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FPL Lab",
  description:
    "Find the best Fantasy Premier League picks. Projected points, expected goals, clean sheets and head-to-head player comparison — plus import your real team.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${outfit.variable} ${mono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-ground text-ink">
        <SiteNav />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-line px-4 py-6 sm:px-6">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 stat text-[10px] text-ink-soft">
            <span>
              Data from the public Fantasy Premier League API · projections are a model, not a
              promise
            </span>
            <span>FPL Lab</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
