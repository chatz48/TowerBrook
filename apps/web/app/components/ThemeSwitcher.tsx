"use client";

import { usePathname, useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import {
  isThemeFocus,
  publishThemeFocus,
  THEME_FOCUS_EVENT,
  type ThemeFocus,
  writeThemeFocusCookie,
} from "@/lib/theme-focus";
import { THEMES } from "@/lib/themes";

const OPTIONS = [
  { id: "all" as const, shortName: "All", accent: "#596579" },
  ...THEMES,
];

export default function ThemeSwitcher({ initialFocus }: { initialFocus: ThemeFocus }) {
  const pathname = usePathname();
  const router = useRouter();
  const [focus, setFocus] = useState<ThemeFocus>(initialFocus);
  const routeValue = pathname.startsWith("/themes/") ? pathname.split("/")[2] : undefined;
  const routeFocus = isThemeFocus(routeValue) && routeValue !== "all" ? routeValue : undefined;
  const activeFocus = routeFocus ?? focus;

  useEffect(() => {
    if (routeFocus && routeFocus !== initialFocus) writeThemeFocusCookie(routeFocus);
  }, [initialFocus, routeFocus]);

  useEffect(() => {
    function syncFocus(event: Event) {
      const nextFocus = (event as CustomEvent<unknown>).detail;
      if (isThemeFocus(nextFocus)) setFocus(nextFocus);
    }
    window.addEventListener(THEME_FOCUS_EVENT, syncFocus);
    return () => window.removeEventListener(THEME_FOCUS_EVENT, syncFocus);
  }, []);

  function changeFocus(nextFocus: ThemeFocus) {
    publishThemeFocus(nextFocus);

    startTransition(() => {
      if (pathname.startsWith("/themes/")) {
        router.push(nextFocus === "all" ? "/" : `/themes/${nextFocus}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <nav
      aria-label="Switch investment theme"
      className="flex min-w-0 items-center gap-1.5 overflow-x-auto px-4 py-1.5"
    >
      <span className="mr-1 shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
        Theme focus
      </span>
      {OPTIONS.map((theme) => {
        const active = activeFocus === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => changeFocus(theme.id)}
            aria-pressed={active}
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
          </button>
        );
      })}
    </nav>
  );
}
