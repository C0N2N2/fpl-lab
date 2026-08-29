"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/", label: "Players" },
  { href: "/fixtures", label: "Fixtures" },
  { href: "/compare", label: "Compare" },
  { href: "/squad", label: "Build" },
  { href: "/team", label: "My team" },
  { href: "/live", label: "Live" },
  { href: "/league", label: "League" },
  { href: "/news", label: "News" },
  { href: "/rules", label: "Rules" },
];

export function SiteNav() {
  const path = usePathname();
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-300 ${
        stuck ? "border-b border-line bg-void/80 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-7 gap-y-3 px-5 py-3.5 sm:px-8">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="cut bg-strike px-2.5 py-1 shadow-[0_0_24px_-6px_var(--strike)] transition group-hover:brightness-110">
            <span className="display text-[17px] leading-none text-white">FPL</span>
          </span>
          <span className="display text-[17px] leading-none tracking-[0.02em]">Lab</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-0.5">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`relative rounded-full px-3 py-1.5 text-[13px] font-semibold transition ${
                  active ? "text-chalk" : "text-chalk-dim hover:text-chalk-mid"
                }`}
              >
                {l.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-0.5 h-[2px] rounded-full bg-strike shadow-[0_0_10px_var(--strike)]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
