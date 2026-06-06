"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EXPERT_TYPE_LABEL } from "@/lib/labels";
import { THEME_SPECIALTIES, THEMES } from "@/lib/themes";
import type { ExpertType, ThemeId } from "@/lib/types";

const EXPERT_TYPES: ExpertType[] = [
  "ex-founder",
  "operator",
  "advisor",
  "banker",
  "lawyer",
  "investor",
  "technical-dd",
  "lender-credit",
];

function specialtiesForTheme(theme: ThemeId | "all") {
  if (theme === "all") {
    return Array.from(new Set(THEMES.flatMap((item) => THEME_SPECIALTIES[item.id]))).sort();
  }
  return THEME_SPECIALTIES[theme];
}

export default function ExpertFilters({
  initialTheme,
  initialSpecialty,
  initialType,
  initialQuery,
}: {
  initialTheme: ThemeId | "all";
  initialSpecialty: string;
  initialType: string;
  initialQuery: string;
}) {
  const [theme, setTheme] = useState<ThemeId | "all">(initialTheme);
  const [specialty, setSpecialty] = useState(initialSpecialty);
  const specialtyOptions = useMemo(() => specialtiesForTheme(theme), [theme]);
  const safeSpecialty =
    specialty !== "all" && !specialtyOptions.includes(specialty) ? "all" : specialty;

  return (
    <form className="ee-panel mb-5 rounded-lg p-4" action="/experts">
      <div className="grid gap-3 md:grid-cols-[1.1fr_1.15fr_0.9fr_minmax(180px,1fr)_auto] md:items-end">
        <label className="block">
          <span className="ee-label text-ink-faint">Theme</span>
          <select
            name="theme"
            value={theme}
            onChange={(event) => {
              const nextTheme = event.target.value as ThemeId | "all";
              const nextSpecialties = specialtiesForTheme(nextTheme);
              setTheme(nextTheme);
              if (specialty !== "all" && !nextSpecialties.includes(specialty)) {
                setSpecialty("all");
              }
            }}
            className="mt-1 h-10 w-full rounded-md border border-line-strong bg-white px-3 text-[13px] outline-none focus:border-accent"
          >
            <option value="all">All three themes</option>
            {THEMES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="ee-label text-ink-faint">Specialty</span>
          <select
            name="specialty"
            value={safeSpecialty}
            onChange={(event) => setSpecialty(event.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-line-strong bg-white px-3 text-[13px] outline-none focus:border-accent"
          >
            <option value="all">All specialties</option>
            {specialtyOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="ee-label text-ink-faint">Expert type</span>
          <select
            name="type"
            defaultValue={initialType}
            className="mt-1 h-10 w-full rounded-md border border-line-strong bg-white px-3 text-[13px] outline-none focus:border-accent"
          >
            <option value="all">All expert types</option>
            {EXPERT_TYPES.map((type) => (
              <option key={type} value={type}>
                {EXPERT_TYPE_LABEL[type]}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="ee-label text-ink-faint">Search people, firms or companies</span>
          <input
            name="q"
            defaultValue={initialQuery}
            placeholder="e.g. banker, BESS, leak detection"
            className="mt-1 h-10 w-full rounded-md border border-line-strong bg-white px-3 text-[13px] outline-none focus:border-accent"
          />
        </label>

        <div className="flex gap-2">
          <button className="ee-button ee-button-primary h-10 px-4" type="submit">
            Search
          </button>
          <Link href="/experts" className="ee-button ee-button-secondary h-10 px-4">
            Reset
          </Link>
        </div>
      </div>
    </form>
  );
}
