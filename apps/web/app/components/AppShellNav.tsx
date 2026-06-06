"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Command Centre", match: "/" },
  { href: "/campaign", label: "Origination Desk", match: "/campaign" },
  { href: "/experts", label: "Experts", match: "/experts" },
  { href: "/companies", label: "Companies", match: "/companies" },
  { href: "/ask", label: "AI Copilot", match: "/ask" },
];

const ADMIN_ITEMS = [
  { href: "/discover", label: "Research Queue", match: "/discover" },
  { href: "/sources", label: "Sources", match: "/sources" },
  { href: "/deals", label: "Deal Evidence", match: "/deals" },
  { href: "/ingest", label: "Ingest", match: "/ingest" },
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
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} mobile={mobile} />
      ))}
      <AdminDropdown pathname={pathname} mobile={mobile} />
    </nav>
  );
}

function NavLink({
  item,
  pathname,
  mobile,
}: {
  item: { href: string; label: string; match: string };
  pathname: string;
  mobile: boolean;
}) {
  const active =
    pathname === item.href ||
    (item.match !== "/" && pathname.startsWith(item.match));
  return (
    <Link
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
}

function AdminDropdown({ pathname, mobile }: { pathname: string; mobile: boolean }) {
  const active = ADMIN_ITEMS.some(
    (item) => pathname === item.href || pathname.startsWith(item.match),
  );

  return (
    <details className="group relative flex h-full shrink-0 items-center">
      <summary
        className={`relative flex h-full cursor-pointer list-none items-center ${mobile ? "px-3 text-[12px]" : "px-4 text-[13px]"} font-medium transition-colors marker:hidden ${
          active ? "text-accent" : "text-ink hover:text-accent"
        }`}
      >
        Admin
        <span className="ml-1 text-[10px] text-ink-faint">v</span>
        {active ? (
          <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" />
        ) : null}
      </summary>
      <div
        className={`absolute top-full z-50 mt-px w-56 overflow-hidden rounded-md border border-line-strong bg-white shadow-lg ${
          mobile ? "left-2" : "right-0"
        }`}
      >
        {ADMIN_ITEMS.map((item) => {
          const itemActive = pathname === item.href || pathname.startsWith(item.match);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block border-b border-line px-3 py-2.5 text-[12px] font-medium last:border-b-0 ${
                itemActive ? "bg-[#edf5ff] text-accent" : "text-ink-soft hover:bg-[#fbfcff] hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </details>
  );
}
