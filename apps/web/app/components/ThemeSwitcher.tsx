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
import {
  INCLUDE_TOWERBROOK_EMPLOYEES_EVENT,
  publishIncludeTowerBrookEmployees,
} from "@/lib/employee-scope";

const OPTIONS = [
  { id: "all" as const, shortName: "All", accent: "#596579" },
  ...THEMES,
];

export default function ThemeSwitcher({
  initialFocus,
  initialIncludeTowerBrookEmployees,
}: {
  initialFocus: ThemeFocus;
  initialIncludeTowerBrookEmployees: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [focus, setFocus] = useState<ThemeFocus>(initialFocus);
  const [includeTowerBrookEmployees, setIncludeTowerBrookEmployees] = useState(
    initialIncludeTowerBrookEmployees,
  );
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

  useEffect(() => {
    function syncEmployeeScope(event: Event) {
      const include = (event as CustomEvent<unknown>).detail;
      if (typeof include === "boolean") setIncludeTowerBrookEmployees(include);
    }
    window.addEventListener(INCLUDE_TOWERBROOK_EMPLOYEES_EVENT, syncEmployeeScope);
    return () =>
      window.removeEventListener(INCLUDE_TOWERBROOK_EMPLOYEES_EVENT, syncEmployeeScope);
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

  function changeEmployeeScope(include: boolean) {
    publishIncludeTowerBrookEmployees(include);
    startTransition(() => router.refresh());
  }

  return (
    <nav
      aria-label="Switch investment theme"
      className="flex min-w-0 items-center gap-1.5 overflow-x-auto px-4 py-1.5"
    >
      <span className="mr-1 shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
        Theme focus
      </span>
      <span className="hidden shrink-0 text-[11px] text-ink-faint lg:inline">
        Filters counts, lists, memo, and graph
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
      <label className="ml-auto flex shrink-0 cursor-pointer items-center gap-2 border-l border-line pl-3 text-[11px] font-medium text-ink-soft">
        <input
          type="checkbox"
          checked={includeTowerBrookEmployees}
          onChange={(event) => changeEmployeeScope(event.target.checked)}
          className="h-3.5 w-3.5 accent-accent"
        />
        Include TowerBrook employees
      </label>
    </nav>
  );
}
