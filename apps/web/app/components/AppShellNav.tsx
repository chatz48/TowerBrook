"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Command Centre", match: "/" },
  { href: "/experts", label: "Call Tray", match: "/experts" },
  { href: "/campaign", label: "Campaign", match: "/campaign" },
  { href: "/deals", label: "Deals", match: "/deals" },
  { href: "/ask", label: "Copilot", match: "/ask" },
  { href: "/graph", label: "Relationship Graph", match: "/graph" },
];

export default function AppShellNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      className={
        mobile
          ? "flex h-11 items-center overflow-x-auto px-2 md:hidden"
          : "hidden h-full items-center md:flex"
      }
      aria-label={mobile ? "Primary mobile" : "Primary"}
    >
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href ||
          (item.match !== "/" && pathname.startsWith(item.match));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex h-full shrink-0 items-center ${mobile ? "px-3 text-[12px]" : "px-4 text-[13px]"} font-medium transition-colors ${
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
