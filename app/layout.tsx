import type { Metadata } from "next";
import { Archivo, Archivo_Black, Azeret_Mono } from "next/font/google";
import "./globals.css";
import { SiteNav } from "@/components/SiteNav";

/** One superfamily for voice, a technical mono for every number. */
const display = Archivo_Black({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const body = Archivo({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const mono = Azeret_Mono({
  variable: "--font-stat",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FPL Lab",
  description:
    "Find the best Fantasy Premier League picks. Projected points, expected goals, clean sheets, live scores and head-to-head comparison — plus import your real team.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <SiteNav />
        <div className="mx-auto w-full max-w-[1500px] flex-1 px-5 pb-16 sm:px-8">{children}</div>

        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 px-5 py-7 sm:px-8">
            <p className="max-w-md text-[12px] leading-relaxed text-chalk-dim">
              Built on the public Fantasy Premier League API. Projections are a model — a better
              starting point than a hunch, a worse one than watching the football.
            </p>
            <span className="display text-[13px] tracking-[0.14em] text-chalk-dim">FPL LAB</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
