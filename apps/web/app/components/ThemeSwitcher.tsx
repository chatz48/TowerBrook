"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { THEMES } from "@/lib/themes";

export default function ThemeSwitcher() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Switch investment theme"
      className="flex min-w-0 items-center gap-1.5 overflow-x-auto px-4 py-1.5"
    >
      <span className="mr-1 shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
        Theme focus
      </span>
      {THEMES.map((theme) => {
        const href = `/themes/${theme.id}`;
        const active = pathname === href;
        return (
          <Link
            key={theme.id}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              active
                ? "border-accent bg-[#edf5ff] text-accent"
                : "border-line bg-white text-ink-soft hover:border-line-strong hover:text-ink"
            }`}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: theme.accent }}
              aria-hidden="true"
            />
            {theme.shortName}
          </Link>
        );
      })}
    </nav>
  );
}
