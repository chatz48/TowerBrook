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

export default function ThemeNavBar({
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
    writeThemeFocusCookie(nextFocus);
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
    <div className="flex items-center gap-1.5" role="group" aria-label="Investment theme selector">
      {OPTIONS.map((theme) => {
        const active = focus === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => changeFocus(theme.id)}
            aria-pressed={active}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
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
      <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
      <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-ink-soft whitespace-nowrap">
        <input
          type="checkbox"
          checked={includeTowerBrookEmployees}
          onChange={(event) => changeEmployeeScope(event.target.checked)}
          className="h-3.5 w-3.5 accent-accent"
        />
        TB team
      </label>
    </div>
  );
}
