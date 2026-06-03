"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/themes/grid-infrastructure", label: "Themes", match: "/themes" },
  { href: "/experts", label: "Experts", match: "/experts" },
  { href: "/companies", label: "Companies", match: "/companies" },
  { href: "/deals", label: "Deals", match: "/deals" },
  { href: "/graph", label: "Graph", match: "/graph" },
  { href: "/reports", label: "Reports", match: "/reports" },
  { href: "/ask", label: "Ask", match: "/ask" },
];

export default function AppShellNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden h-full items-center md:flex" aria-label="Primary">
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href ||
          (item.match !== "/" && pathname.startsWith(item.match));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex h-full items-center px-4 text-[13px] font-medium transition-colors ${
              active ? "text-accent" : "text-ink hover:text-accent"
            }`}
          >
            {item.label}
            {active ? (
              <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
