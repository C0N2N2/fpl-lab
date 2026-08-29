"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Players" },
  { href: "/fixtures", label: "Fixtures" },
  { href: "/compare", label: "Compare" },
  { href: "/squad", label: "Build" },
  { href: "/team", label: "My team" },
  { href: "/league", label: "League" },
  { href: "/news", label: "News" },
  { href: "/rules", label: "How it works" },
];

export function SiteNav() {
  const path = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b-2 border-ink bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="display bg-red px-2 py-0.5 text-2xl text-white transition group-hover:bg-red-hot">
            FPL
          </span>
          <span className="display text-2xl text-ink">Lab</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                  active
                    ? "bg-ink text-ground"
                    : "text-ink-mid hover:bg-yellow-wash hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
